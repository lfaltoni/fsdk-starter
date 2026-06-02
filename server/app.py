"""
FSDK Starter — Single-file Flask backend wiring all foundation-sdk domains.

This is a template app demonstrating how to wire every foundation-sdk domain
into a working backend. Clone this, customize, and build your product on top.

Domain wiring order (dependency-driven):
  1. Flask app + config
  2. Database
  3. Audit service (no deps — other services optionally depend on it)
  4. Email
  5. MFA (depends on email)
  6. Auth + Users (depends on MFA for admin wiring)
  7. Lifecycle hooks
  8. Admin user service (depends on MFA, audit)
  9. Media
  10. Reviews (stateless)
  11. Flask-Login
  12. CORS
  13. Flask-Smorest API
  14. Blueprint registration
  15. Optional domains (billing, tenancy, LLM) — env-gated
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)

# ============================================================================
# 1. Flask App + Config
# ============================================================================

from flask import Flask, jsonify
from foundation.core.config import config
from foundation.core.logging_config import setup_logging, get_logger

setup_logging(config)
logger = get_logger('starter')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-change-in-production')
app.config['DEBUG'] = config.DEBUG
app.config['BASE_URL'] = os.getenv('BASE_URL', 'http://localhost:5001')
app.config['APP_NAME'] = os.getenv('APP_NAME', 'FSDK Starter')

# Session cookies
# SameSite=None requires Secure (HTTPS). In local dev over HTTP, use Lax.
_is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
app.config['SESSION_COOKIE_SECURE'] = not _is_dev
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' if _is_dev else 'None'

# ============================================================================
# 2. Database
# ============================================================================

from foundation.database.session import db

app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ============================================================================
# 3. Audit Service (no dependencies — others depend on it)
# ============================================================================

from foundation.audit import configure_audit

configure_audit(app, app_id='fsdk-starter')

# ============================================================================
# 4. Email
# ============================================================================

from foundation.email import configure_email

configure_email(app)

# ============================================================================
# 5. MFA (depends on email service)
# ============================================================================

from foundation.mfa import MfaService

_mfa_hmac_key = os.getenv('MFA_HMAC_KEY', '')
if _mfa_hmac_key:
    app.mfa_service = MfaService(
        hmac_key=_mfa_hmac_key.encode(),
        app_name=app.config['APP_NAME'],
    )
    logger.info('MFA service enabled')
else:
    app.mfa_service = None
    logger.info('MFA disabled (no MFA_HMAC_KEY)')

# ============================================================================
# 6. Auth + Users
# ============================================================================

from foundation.auth.auth_service import AuthProvider, get_auth_service
from foundation.users.service import UserService

auth_provider = AuthProvider.from_string(config.DATABASE_TYPE)
auth_service = get_auth_service(auth_provider)

user_service = UserService(auth_provider, auth_service=auth_service)
user_service.init_app(app)

app.user_service = user_service
app.auth_service = user_service.auth_service

# ============================================================================
# 7. Lifecycle Hooks
# ============================================================================

import importlib
from foundation.core.lifecycle import UserLifecycleRegistry

LIFECYCLE_MODULES = [
    'foundation.users.hooks',     # UserApplicationStats + welcome email
    'foundation.sessions.hooks',  # delete session rows when a user is deleted
]

for module_path in LIFECYCLE_MODULES:
    try:
        mod = importlib.import_module(module_path)
        mod.init(UserLifecycleRegistry)
    except ImportError:
        logger.warning(f'Lifecycle module not found: {module_path}')
    except Exception as e:
        logger.error(f'Failed to init lifecycle module {module_path}: {e}')
        raise

# ============================================================================
# 8. Admin User Service (depends on MFA, audit)
# ============================================================================

from foundation.admin import AdminUserService

app.admin_user_service = AdminUserService(
    mfa_service=app.mfa_service,
)

# ============================================================================
# 9. Media
# ============================================================================

from foundation.media import MediaService, LocalStorageProvider

_upload_base = os.path.join(os.path.dirname(__file__), 'uploads')
_upload_base = os.path.abspath(_upload_base)

storage_provider = LocalStorageProvider(
    base_path=_upload_base,
    base_url=os.getenv('MEDIA_BASE_URL', f"http://localhost:{os.getenv('PORT', '5001')}"),
)
app.media_service = MediaService(storage_provider)

# ============================================================================
# 9b. Sessions (active session / device registry)
# ============================================================================
# Default-on backend tracking + per-session revocation gate. Calling
# configure_sessions registers the service for auto-discovery by the auth layer;
# registering sessions_blp (below) surfaces the "your devices" UI.

from foundation.sessions import configure_sessions

# Collaborators (audit/email) are omitted here so they are auto-discovered at
# request time from app.extensions; pass a geo_resolver via SESSION_GEO_RESOLVER
# config to enable approximate locations (FSDK ships none).
configure_sessions(app, app_name=app.config['APP_NAME'])

# ============================================================================
# 10. Flask-Login
# ============================================================================

from flask_login import LoginManager
from foundation.users.models import User

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, user_id)

@login_manager.unauthorized_handler
def unauthorized():
    from flask import request
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Authentication required'}), 401
    return jsonify({'error': 'Authentication required'}), 401

# JWT Bearer token → Flask-Login session bridge.
# See foundation-sdk/foundation/auth/jwt.py for details.
from foundation.auth.jwt import configure_jwt_session_bridge
configure_jwt_session_bridge(app)

# ============================================================================
# 11. CORS
# ============================================================================

from flask_cors import CORS

_cors_origins = [o.strip() for o in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if o.strip()]
CORS(app, origins=_cors_origins, supports_credentials=True, allow_headers=['Content-Type', 'Authorization'])

# ============================================================================
# 12. Flask-Smorest API
# ============================================================================

from flask_smorest import Api

app.config['API_TITLE'] = app.config['APP_NAME'] + ' API'
app.config['API_VERSION'] = 'v1'
app.config['OPENAPI_VERSION'] = '3.0.2'
app.config['OPENAPI_URL_PREFIX'] = '/api-docs'

api = Api(app)

# ============================================================================
# 13. Import All Models (required before create_all)
# ============================================================================
# Import every domain's models so SQLAlchemy registers their tables.

from foundation.users.models import User, UserProfile, UserApplicationStats  # noqa: F811
from foundation.social_auth.models import SocialAuthAccount  # noqa: F401
from foundation.media.models import MediaAsset, MediaAssociation  # noqa: F401
from foundation.reviews.models import Review, ReviewReply, ReviewVote  # noqa: F401
from foundation.mfa.models import MfaEnrollment, MfaChallenge  # noqa: F401
from foundation.audit.models import AuditEntry  # noqa: F401
from foundation.invites.models import PlatformInvite  # noqa: F401
from foundation.sessions.models import UserSession  # noqa: F401

# ============================================================================
# 14. Blueprint Registration
# ============================================================================

# Auth
from foundation.auth.api.smorest_auth_blueprint import auth_blp
api.register_blueprint(auth_blp)

# Google SSO (optional — only if GOOGLE_CLIENT_ID is set)
app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID', '')
if app.config['GOOGLE_CLIENT_ID']:
    from foundation.social_auth import init_social_auth
    init_social_auth(app, api)
    logger.info('Google SSO enabled')

# User profile
from foundation.users.api.smorest_profile_blueprint import profile_blp
api.register_blueprint(profile_blp)

# Media
from foundation.media.api.smorest_media_blueprint import media_blp
api.register_blueprint(media_blp)

# Reviews
from foundation.reviews.api.smorest_reviews_blueprint import reviews_blp
api.register_blueprint(reviews_blp)

# MFA (only if service is configured)
if app.mfa_service:
    from foundation.mfa.api import mfa_blp
    api.register_blueprint(mfa_blp)
    logger.info('MFA blueprint registered')

# Audit
from foundation.audit.api import audit_blp
api.register_blueprint(audit_blp)

# Sessions (active session / device management — "your devices" UI)
from foundation.sessions.api import sessions_blp
api.register_blueprint(sessions_blp)

# Admin user management (session-auth version for the frontend)
from foundation.admin import create_admin_session_blueprint
admin_session_blp = create_admin_session_blueprint()
api.register_blueprint(admin_session_blp)

# Invites
from foundation.invites import PlatformInviteService
app.invite_service = PlatformInviteService()
from foundation.invites.api import invites_blp, invite_token_blp
api.register_blueprint(invites_blp)
api.register_blueprint(invite_token_blp)

# ============================================================================
# 15. Optional Domains (env-gated)
# ============================================================================

if os.getenv('ENABLE_BILLING', 'false').lower() == 'true':
    try:
        from foundation.billing.api import create_billing_blueprint
        from flask_login import current_user, login_required
        billing_blp = create_billing_blueprint(
            owner_id_getter=lambda: current_user.user_id,
            auth_decorators=[login_required],
        )
        api.register_blueprint(billing_blp)
        logger.info('Billing domain enabled')
    except ImportError:
        logger.warning('Billing domain not available in this foundation-sdk version')

if os.getenv('ENABLE_TENANCY', 'false').lower() == 'true':
    try:
        from foundation.teams.api import create_team_blueprint
        from flask_login import login_required
        team_blp = create_team_blueprint(auth_decorators=[login_required])
        api.register_blueprint(team_blp)
        logger.info('Tenancy/teams domain enabled')
    except ImportError:
        logger.warning('Teams domain not available in this foundation-sdk version')

# ============================================================================
# 16. Serve Uploads (development convenience)
# ============================================================================

from flask import send_file as _send_file

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    file_path = os.path.join(_upload_base, filename)
    if os.path.exists(file_path):
        return _send_file(file_path)
    return jsonify({'error': 'File not found'}), 404

# ============================================================================
# 17. Root Endpoint
# ============================================================================

@app.route('/')
def index():
    return jsonify({
        'app': app.config['APP_NAME'],
        'version': '0.1.0',
        'docs': '/api-docs/openapi.json',
    })

# ============================================================================
# 18. Seed Admin (CLI)
# ============================================================================

def seed_admin():
    """Create a super_admin user if none exists."""
    with app.app_context():
        db.create_all()
        from foundation.users.models import User
        admin = User.query.filter_by(platform_role='super_admin').first()
        if admin:
            print(f'Admin already exists: {admin.email}')
            return
        try:
            new_user = user_service.create_user(
                email='admin@admin.com',
                password='admin',
                first_name='Admin',
                last_name='User',
            )
            new_user.platform_role = 'super_admin'
            db.session.commit()
            print(f'Admin created: admin@admin.com / admin')
        except Exception as e:
            print(f'Failed to create admin: {e}')

# ============================================================================
# 19. Run
# ============================================================================

if __name__ == '__main__':
    if '--seed-admin' in sys.argv:
        seed_admin()
        sys.exit(0)

    port = int(os.getenv('PORT', 5001))

    with app.app_context():
        db.create_all()

    logger.info('=' * 50)
    logger.info(f'  {app.config["APP_NAME"]}')
    logger.info(f'  Port: {port}')
    logger.info(f'  DB:   {config.SQLALCHEMY_DATABASE_URI}')
    logger.info(f'  CORS: {_cors_origins}')
    logger.info('=' * 50)

    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
