"""Pytest fixtures for the FSDK Starter backend.

The starter's ``app.py`` is a single-file script that builds the Flask app at
import time, so the environment has to be set up BEFORE it is imported. That is
what the module-level block below does: point the app at a throwaway SQLite file
and turn off anything that would reach the network.
"""

import io
import os
import sys
import tempfile
import uuid

import pytest

# --- environment must be set before `import app` --------------------------
_TMP_DB = os.path.join(tempfile.mkdtemp(prefix='fsdk-starter-tests-'), 'test.db')

os.environ['SECRET_KEY'] = 'test-secret-key-for-fsdk-starter-tests'
os.environ['DB_TYPE'] = 'sqlite'
os.environ['DB_NAME'] = _TMP_DB
os.environ['ENVIRONMENT'] = 'development'
os.environ['APP_NAME'] = 'FSDK Starter Test'
os.environ.pop('DATABASE_URL', None)
os.environ['RESEND_API_KEY'] = 'test-resend-key-no-mail-is-sent-by-these-tests'
os.environ['GOOGLE_CLIENT_ID'] = ''
os.environ['MFA_HMAC_KEY'] = ''
os.environ['ENABLE_BILLING'] = 'false'
os.environ['ENABLE_TENANCY'] = 'false'

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- PRE-EXISTING BUG WORKAROUND (test-only, no production behaviour changed) --
# `app.py` calls `configure_email(app)` with nothing in `app.config` naming a
# mail transport, and the current foundation-sdk refuses to register a dead
# adapter: it raises FoundationConfigurationError('email.adapter_dead') at
# import. The starter therefore does not boot as shipped — a separate bug from
# the media authorization hole these tests cover (blogmachine-deploy/run.py:218
# shows the missing wiring). The SDK documents an explicit escape hatch for
# "run without mail on purpose"; we take it here so the tests can import the
# app. Remove this shim once app.py wires a real mail transport.
import foundation.email as _fsdk_email  # noqa: E402
from foundation.email.providers.console_adapter import ConsoleEmailAdapter  # noqa: E402

_real_configure_email = _fsdk_email.configure_email
_fsdk_email.configure_email = lambda app, adapter=None, provider=None: (
    _real_configure_email(app, adapter=ConsoleEmailAdapter())
)

# The same "consumer has not caught up with the SDK's hardening" story repeats
# for PROFILE_DATA_ALLOWED_KEYS: registering profile_blp raises
# FoundationConfigurationError('users.profile_schema_undeclared') unless the app
# declares it. app.py builds its Flask object at import time, so the only place
# to seed config is Flask.__init__ itself.
import flask  # noqa: E402

_orig_flask_init = flask.Flask.__init__


def _flask_init_with_test_config(self, *args, **kwargs):
    _orig_flask_init(self, *args, **kwargs)
    self.config.setdefault('PROFILE_DATA_ALLOWED_KEYS', {'name', 'bio'})


flask.Flask.__init__ = _flask_init_with_test_config

import app as starter_app  # noqa: E402

from foundation.database.session import db as _db  # noqa: E402
from foundation.media.models import MediaAsset, MediaAssociation  # noqa: E402
from foundation.users.models import User  # noqa: E402


@pytest.fixture(scope='session')
def app():
    flask_app = starter_app.app
    flask_app.config['TESTING'] = True
    with flask_app.app_context():
        _db.create_all()
    # Deliberately NOT holding an app context open for the whole session: Flask
    # reuses an already-pushed app context for test-client requests, so a
    # session-scoped one would make `g` global to the entire run. Flask-Login
    # caches the loaded user in `g._login_user`, and that cached instance
    # outlives the rows `clean_tables` deletes (ObjectDeletedError on the next
    # request). Every helper below opens its own short-lived context instead.
    yield flask_app


@pytest.fixture(autouse=True)
def clean_tables(app):
    """Truncate the tables these tests touch, before every test."""
    with app.app_context():
        MediaAssociation.query.delete()
        MediaAsset.query.delete()
        User.query.delete()
        _db.session.commit()
        # Tear the scoped session down entirely, not just expunge: the app is
        # session-scoped, so instances left in the identity map by a previous
        # test (e.g. the user Flask-Login loaded) outlive the rows they point
        # at and raise ObjectDeletedError on the next refresh.
        _db.session.remove()
    yield


@pytest.fixture
def client(app):
    return app.test_client()


def _make_user(app, email):
    with app.app_context():
        user = User(
            user_id=str(uuid.uuid4()),
            username=email.split('@')[0],
            email=email,
            first_name='Test',
            last_name='User',
            active=True,
            fs_uniquifier=str(uuid.uuid4()),
        )
        user.set_password('test-password-123')
        _db.session.add(user)
        _db.session.commit()
        return {
            'user_id': user.user_id,
            'email': user.email,
            'fs_uniquifier': user.fs_uniquifier,
            'password': 'test-password-123',
        }


@pytest.fixture
def owner(app):
    return _make_user(app, 'owner@example.com')


@pytest.fixture
def attacker(app):
    return _make_user(app, 'attacker@example.com')


def jwt_headers(app, user):
    """Auth channel 1 — JWT Bearer token."""
    from foundation.auth.jwt import sign_token

    with app.app_context():
        token = sign_token(
            user_id=user['user_id'],
            email=user['email'],
            fs_uniquifier=user['fs_uniquifier'],
        )
    return {'Authorization': f'Bearer {token}'}


def cookie_client(app, user):
    """Auth channel 2 — Flask-Login session cookie.

    ``auth_required`` tries the cookie first and only falls through to the JWT
    branch when no session is present, so a test that only exercises the Bearer
    header proves nothing about the cookie path.

    The session keys are written directly rather than by calling
    ``login_user()`` inside a scratch request context: that would leave the
    logged-in User cached in ``g`` and leak it into later tests.
    """
    c = app.test_client()
    with c.session_transaction() as sess:
        sess['_user_id'] = user['user_id']
        sess['_fresh'] = True
    return c


def make_media(app, entity_type, entity_id, association_type='gallery'):
    """Insert a media association directly, bypassing the service.

    Built with the models rather than ``MediaService.upload_media`` on purpose:
    the fixture must not depend on the very authorization path under test.
    """
    with app.app_context():
        asset = MediaAsset(
            original_filename='seed.png',
            storage_key=f'seed-{uuid.uuid4().hex}.png',
            storage_provider='local',
            storage_url='http://localhost/uploads/seed.png',
            content_type='image/png',
            file_size=len(PNG_BYTES),
            file_hash=uuid.uuid4().hex,
        )
        _db.session.add(asset)
        _db.session.flush()
        assoc = MediaAssociation(
            media_asset_id=asset.id,
            entity_type=entity_type,
            entity_id=entity_id,
            association_type=association_type,
            sort_order=0,
            is_primary=False,
            is_active=True,
        )
        _db.session.add(assoc)
        _db.session.commit()
        return assoc.id


# A minimal valid 1x1 PNG — real bytes, so image processing does not choke.
PNG_BYTES = bytes.fromhex(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4'
    '890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082'
)


def png_upload(entity_type, entity_id, association_type='gallery'):
    return {
        'file': (io.BytesIO(PNG_BYTES), 'attack.png'),
        'entity_type': entity_type,
        'entity_id': str(entity_id),
        'association_type': association_type,
    }
