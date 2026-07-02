// Only these schemes are safe to place in an <a href>. A stored value like
// `javascript:…` or `data:…` would otherwise execute when the link is clicked.
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Return `url` only if it is a safe, absolute http(s) link; otherwise `null`.
 *
 * Defense in depth: the API already rejects non-http(s) URLs on write, but this
 * guards any pre-existing rows so a malicious value can never become an
 * executable href in the browser.
 */
export function safeExternalUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null; // relative or malformed — not a usable external link
  }
  return ALLOWED_PROTOCOLS.has(parsed.protocol) ? url : null;
}
