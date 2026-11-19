import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  normalizeUrl,
  generateSlug,
  parseStored,
  serialize,
  addBookmark,
  formatBookmark,
} from '../src/lib/bookmarks.js';

test('storage key is mona-bookmarks', () => {
  assert.equal(STORAGE_KEY, 'mona-bookmarks');
});

test('a URL with and without https:// normalises to the same value', () => {
  assert.equal(normalizeUrl('www.example.com'), normalizeUrl('https://www.example.com'));
  assert.equal(normalizeUrl('  example.com/path  '), 'https://example.com/path');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/');
});

test('invalid URLs are rejected', () => {
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl('   '), null);
  assert.equal(normalizeUrl('not a url'), null);
  assert.equal(normalizeUrl('javascript://alert(1)'), null);
  assert.equal(normalizeUrl(undefined), null);
});

test('slugs use the mona- prefix with base62 characters and avoid duplicates', () => {
  const slug = generateSlug([]);
  assert.match(slug, /^mona-[0-9a-zA-Z]{4}$/);
  let calls = 0;
  const fixed = () => (calls++ < 4 ? 0 : 0.5);
  const second = generateSlug([{ slug: 'mona-0000' }], fixed);
  assert.notEqual(second, 'mona-0000');
});

test('loading empty, corrupted, legacy or non-array values never throws', () => {
  assert.deepEqual(parseStored(null), []);
  assert.deepEqual(parseStored(''), []);
  assert.deepEqual(parseStored('{not json'), []);
  assert.deepEqual(parseStored('{"url":"https://example.com/","slug":"mona-abcd"}'), []);
  assert.deepEqual(parseStored('42'), []);
  assert.deepEqual(parseStored('null'), []);
  const legacy = parseStored('["example.com", 7, null]');
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].url, 'https://example.com/');
  assert.match(legacy[0].slug, /^mona-/);
});

test('malformed entries are dropped and valid ones are kept', () => {
  const raw = JSON.stringify([
    { url: 'https://github.com/', slug: 'mona-7fk2' },
    { url: 'https://github.com/', slug: 'bad' },
    { url: 42, slug: 'mona-1234' },
    'not a url',
  ]);
  assert.deepEqual(parseStored(raw), [{ url: 'https://github.com/', slug: 'mona-7fk2' }]);
});

test('add then save then load round trips', () => {
  const { bookmarks, bookmark } = addBookmark([], 'github.com/features/copilot');
  assert.equal(bookmark.url, 'https://github.com/features/copilot');
  assert.deepEqual(parseStored(serialize(bookmarks)), bookmarks);
  const failed = addBookmark(bookmarks, '');
  assert.ok(failed.error);
  assert.equal(failed.bookmarks.length, 1);
});

test('a saved bookmark formats as "<url> :: <slug>"', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    'https://www.example.com :: mona-7fk2',
  );
});
