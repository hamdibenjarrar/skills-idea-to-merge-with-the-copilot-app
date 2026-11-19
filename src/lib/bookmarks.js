// Pure helpers for the bookmarks feature.
// No browser APIs are used here, so these run in the client script and in Node unit tests.

export const STORAGE_KEY = 'mona-bookmarks';
export const SLUG_PREFIX = 'mona-';
export const SEPARATOR = ' :: ';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Normalise a URL the user typed. Adds https:// when no scheme is given,
 * trims spaces and returns the canonical href. Returns null when the
 * value is empty or is not a valid http(s) URL.
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
  return parsed.href;
}

/**
 * Encode a non negative integer in base62.
 * @param {number} value
 * @returns {string}
 */
export function toBase62(value) {
  let n = Math.max(0, Math.floor(value));
  if (n === 0) return '0';
  let out = '';
  while (n > 0) {
    out = BASE62[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

/**
 * Generate a short mona- slug that is not already used.
 * @param {Array<{slug: string}>} existing
 * @param {() => number} [random]
 * @returns {string}
 */
export function generateSlug(existing = [], random = Math.random) {
  const taken = new Set(existing.map((b) => b.slug));
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const length = attempt < 500 ? 4 : 6;
    let body = '';
    for (let i = 0; i < length; i += 1) {
      body += BASE62[Math.floor(random() * 62) % 62];
    }
    const slug = SLUG_PREFIX + body;
    if (!taken.has(slug)) return slug;
  }
  return SLUG_PREFIX + toBase62(Date.now());
}

/**
 * Check that a value is a valid bookmark object.
 * @param {unknown} value
 * @returns {value is {url: string, slug: string}}
 */
export function isBookmark(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.url === 'string' &&
    typeof value.slug === 'string' &&
    value.slug.startsWith(SLUG_PREFIX) &&
    normalizeUrl(value.url) !== null
  );
}

/**
 * Parse the raw stored value. Never throws. Anything malformed is dropped.
 * Legacy entries stored as plain URL strings are upgraded with a new slug.
 * @param {string | null | undefined} raw
 * @returns {Array<{url: string, slug: string}>}
 */
export function parseStored(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const result = [];
  for (const item of data) {
    if (isBookmark(item)) {
      if (!result.some((b) => b.slug === item.slug)) {
        result.push({ url: normalizeUrl(item.url), slug: item.slug });
      }
    } else if (typeof item === 'string') {
      const url = normalizeUrl(item);
      if (url) result.push({ url, slug: generateSlug(result) });
    }
  }
  return result;
}

/**
 * Serialise bookmarks for storage, keeping only valid entries.
 * @param {Array<{url: string, slug: string}>} bookmarks
 * @returns {string}
 */
export function serialize(bookmarks) {
  const clean = Array.isArray(bookmarks) ? bookmarks.filter(isBookmark).map(({ url, slug }) => ({ url, slug })) : [];
  return JSON.stringify(clean);
}

/**
 * Add a bookmark from user input. Returns the new list and the bookmark,
 * or an error message when the URL is not valid.
 * @param {Array<{url: string, slug: string}>} bookmarks
 * @param {string} input
 * @param {() => number} [random]
 */
export function addBookmark(bookmarks, input, random = Math.random) {
  const list = Array.isArray(bookmarks) ? bookmarks.filter(isBookmark) : [];
  const url = normalizeUrl(input);
  if (!url) return { bookmarks: list, error: 'Please enter a valid web address, for example example.com.' };
  const bookmark = { url, slug: generateSlug(list, random) };
  return { bookmarks: [...list, bookmark], bookmark };
}

/**
 * Format a bookmark for display: "<url> :: <slug>".
 * @param {{url: string, slug: string}} bookmark
 * @returns {string}
 */
export function formatBookmark(bookmark) {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}
