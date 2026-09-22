"""Authorization tests for the foundation-sdk media endpoints.

WHY THESE TESTS EXIST
---------------------
``foundation.media.MediaService`` only enforces entity ownership when an
``owner_check`` predicate has been injected via ``MediaService.configure()``.
With none configured it returns early and allows the mutation (see
``foundation/media/services.py::_check_owner``). Registering ``media_blp``
without configuring that predicate therefore lets ANY authenticated user
upload to, delete from, reorder and re-flag media on ANY entity they can name
in the request — OWASP API1 / BOLA.

The tests below are deliberately NEGATIVE. A positive "the owner can upload"
test passes identically whether or not an authorization check exists, so it is
structurally blind to this bug. Only "a stranger is refused" can fail when the
check is missing.

Both auth channels are exercised. ``foundation.auth.dependencies.auth_required``
tries the Flask-Login session cookie first and only falls through to the JWT
Bearer branch when no session is present, so proving one channel proves nothing
about the other.
"""

import pytest

from conftest import cookie_client, jwt_headers, make_media, png_upload

# fsdk-starter ships no media-bearing domain entity of its own, so no
# entity_type is authorized. Any value a caller invents must be refused.
UNOWNED_ENTITY_TYPE = 'demo_items'
UNOWNED_ENTITY_ID = 42


def _channels(app, user):
    """(name, client, headers) for every auth channel the app accepts."""
    return [
        ('jwt', app.test_client(), jwt_headers(app, user)),
        ('session-cookie', cookie_client(app, user), {}),
    ]


# ---------------------------------------------------------------------------
# Negative — a stranger must not mutate media on an entity they do not own.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('channel', ['jwt', 'session-cookie'])
def test_upload_to_unowned_entity_is_refused(app, attacker, channel):
    name, client, headers = next(c for c in _channels(app, attacker) if c[0] == channel)
    resp = client.post(
        '/api/media/upload',
        data=png_upload(UNOWNED_ENTITY_TYPE, UNOWNED_ENTITY_ID),
        headers=headers,
        content_type='multipart/form-data',
    )
    assert resp.status_code == 403, (
        f'[{name}] upload to an unowned entity returned {resp.status_code}; '
        'a non-owner must be refused'
    )


@pytest.mark.parametrize('channel', ['jwt', 'session-cookie'])
def test_delete_unowned_media_is_refused(app, attacker, channel):
    media_id = make_media(app, UNOWNED_ENTITY_TYPE, UNOWNED_ENTITY_ID)
    name, client, headers = next(c for c in _channels(app, attacker) if c[0] == channel)
    resp = client.delete(f'/api/media/{media_id}', headers=headers)
    assert resp.status_code == 403, (
        f'[{name}] delete of unowned media returned {resp.status_code}; '
        'a non-owner must be refused'
    )


@pytest.mark.parametrize('channel', ['jwt', 'session-cookie'])
def test_set_primary_on_unowned_media_is_refused(app, attacker, channel):
    media_id = make_media(app, UNOWNED_ENTITY_TYPE, UNOWNED_ENTITY_ID)
    name, client, headers = next(c for c in _channels(app, attacker) if c[0] == channel)
    resp = client.put(f'/api/media/{media_id}/primary', headers=headers)
    assert resp.status_code == 403, (
        f'[{name}] set-primary on unowned media returned {resp.status_code}; '
        'a non-owner must be refused'
    )


@pytest.mark.parametrize('channel', ['jwt', 'session-cookie'])
def test_reorder_unowned_media_is_refused(app, attacker, channel):
    first = make_media(app, UNOWNED_ENTITY_TYPE, UNOWNED_ENTITY_ID)
    second = make_media(app, UNOWNED_ENTITY_TYPE, UNOWNED_ENTITY_ID)
    name, client, headers = next(c for c in _channels(app, attacker) if c[0] == channel)
    resp = client.put(
        f'/api/media/entity/{UNOWNED_ENTITY_TYPE}/{UNOWNED_ENTITY_ID}/reorder',
        json={'ordered_ids': [second, first]},
        headers=headers,
    )
    assert resp.status_code == 403, (
        f'[{name}] reorder of unowned media returned {resp.status_code}; '
        'a non-owner must be refused'
    )


def test_unknown_entity_type_is_refused(app, attacker):
    """Deny-by-default: an entity_type with no rule in the registry is refused.

    This is the property that makes the registry safe to extend — adding a
    media-bearing model and forgetting to register a rule is a 403, not a hole.
    """
    client = app.test_client()
    resp = client.post(
        '/api/media/upload',
        data=png_upload('totally_made_up_type', 7),
        headers=jwt_headers(app, attacker),
        content_type='multipart/form-data',
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Positive — the registry is a gate, not a wall.
# ---------------------------------------------------------------------------


@pytest.fixture
def registered_rule(app, owner):
    """Temporarily register an ownership rule, as a real app would.

    fsdk-starter has no owned, integer-keyed entity of its own, so the positive
    case has to supply one. This proves the registry actually admits a
    legitimate owner — a predicate that denies everyone unconditionally would
    be a worse outage than the bug it fixes.
    """
    import app as starter_app

    owned_id = 99
    starter_app.MEDIA_OWNER_RULES['test_widget'] = (
        lambda user_id, entity_id: user_id == owner['user_id'] and entity_id == owned_id
    )
    yield owned_id
    del starter_app.MEDIA_OWNER_RULES['test_widget']


@pytest.mark.parametrize('channel', ['jwt', 'session-cookie'])
def test_owner_can_upload_when_a_rule_admits_them(app, owner, registered_rule, channel):
    name, client, headers = next(c for c in _channels(app, owner) if c[0] == channel)
    resp = client.post(
        '/api/media/upload',
        data=png_upload('test_widget', registered_rule),
        headers=headers,
        content_type='multipart/form-data',
    )
    assert resp.status_code == 201, (
        f'[{name}] the legitimate owner was refused ({resp.status_code}: '
        f'{resp.get_data(as_text=True)[:200]}) — the predicate is too strict'
    )


def test_non_owner_refused_on_a_registered_rule(app, attacker, registered_rule):
    """The rule admits its owner and only its owner."""
    client = app.test_client()
    resp = client.post(
        '/api/media/upload',
        data=png_upload('test_widget', registered_rule),
        headers=jwt_headers(app, attacker),
        content_type='multipart/form-data',
    )
    assert resp.status_code == 403


def test_owner_can_delete_and_set_primary_and_reorder(app, owner, registered_rule):
    """The owner retains every mutating operation, not just upload."""
    client = app.test_client()
    headers = jwt_headers(app, owner)
    first = make_media(app, 'test_widget', registered_rule)
    second = make_media(app, 'test_widget', registered_rule)

    assert client.put(f'/api/media/{first}/primary', headers=headers).status_code == 200
    assert (
        client.put(
            f'/api/media/entity/test_widget/{registered_rule}/reorder',
            json={'ordered_ids': [second, first]},
            headers=headers,
        ).status_code
        == 200
    )
    assert client.delete(f'/api/media/{first}', headers=headers).status_code == 200


# ---------------------------------------------------------------------------
# Wiring — the guard itself.
# ---------------------------------------------------------------------------


def test_owner_check_is_installed(app):
    """The predicate must be configured, not merely defined.

    ``MediaService._owner_check`` is class-level state; if the
    ``MediaService.configure()`` call is ever removed from app.py every test
    above would still pass for the wrong reason on an app that never registers
    media. This asserts the wiring directly.
    """
    from foundation.media import MediaService

    assert MediaService._owner_check is not None
