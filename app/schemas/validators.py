"""Reusable Pydantic v2 field types that bound user-supplied input.

Two concerns, kept in one place so every schema shares the same rules:

1. **Length caps** — every free-text field is length-limited so an authenticated
   (or essentially-anonymous demo) client can't submit multi-megabyte payloads
   that exhaust storage and bloat exports / the calendar feed.

2. **URL scheme allowlist** — link fields accept only ``http``/``https`` so a
   stored value can never become a ``javascript:`` / ``data:`` payload when the
   UI renders it as an ``<a href>`` (React does not sanitize those schemes).
"""

from typing import Annotated
from urllib.parse import urlparse

from pydantic import AfterValidator, StringConstraints

# Single-line labels (school, name, title, …). Generous but bounded.
ShortStr = Annotated[str, StringConstraints(max_length=200)]
# Free-form prose (notes). Larger cap, still bounded.
Notes = Annotated[str, StringConstraints(max_length=5000)]

_ALLOWED_URL_SCHEMES = {"http", "https"}


def _validate_web_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme.lower() not in _ALLOWED_URL_SCHEMES:
        raise ValueError("URL must start with http:// or https://")
    if not parsed.netloc:
        raise ValueError("URL must include a host")
    return value


# A length-capped URL constrained to http(s). Optional fields pair this with
# ``| None``; ``None`` bypasses the validators, so clearing a URL still works.
WebUrl = Annotated[
    str,
    StringConstraints(max_length=2048),
    AfterValidator(_validate_web_url),
]
