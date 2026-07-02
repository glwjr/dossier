"""Transactional email via Resend's HTTP API (no SDK — httpx is already a dep).

Env-gated: a no-op unless both RESEND_API_KEY and REMINDER_FROM_EMAIL are set,
so dev and tests never send. PII (recipient address) is only sent to Resend.
"""

import httpx

from app.config import settings

_RESEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str) -> bool:
    """Send one email. Returns whether it was actually sent (False = disabled).

    Raises on an HTTP error so callers/schedulers surface delivery failures
    rather than silently dropping mail.
    """
    if not settings.resend_api_key or not settings.reminder_from_email:
        return False
    resp = httpx.post(
        _RESEND_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.reminder_from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return True
