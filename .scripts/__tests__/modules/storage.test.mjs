import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..', '..', '..');

// === localStorage mock ===
globalThis.localStorage = {
  _store: new Map(),
  getItem(k) { return this._store.get(k) ?? null; },
  setItem(k, v) { this._store.set(k, String(v)); },
  removeItem(k) { this._store.delete(k); },
  clear() { this._store.clear(); },
};

// === Minimal DOM stubs for favorites (updateFavBadge, updateShortlistBar, toggleFavorite) ===
globalThis.document = {
  _elements: {},
  getElementById(id) { return this._elements[id] || null; },
};
globalThis.window = globalThis;
globalThis.window.location = { origin: 'https://peuterplannen.nl', href: 'https://peuterplannen.nl/app.html' };
globalThis.window.history = { replaceState() {} };
globalThis.window.toggleTag = () => {};
Object.defineProperty(globalThis, 'navigator', {
  value: { share: null, clipboard: { writeText: async () => {} } },
  writable: true, configurable: true,
});

// ============================================================
// visited.js — no external deps, direct import
// ============================================================
const { markVisited, getVisited, isVisited } = await import(resolve(rootDir, 'modules', 'visited.js'));

describe('visited module', () => {
  beforeEach(() => localStorage.clear());

  describe('getVisited', () => {
    it('returns empty array when nothing stored', () => {
      assert.deepEqual(getVisited(), []);
    });

    it('returns parsed array from localStorage', () => {
      localStorage.setItem('pp_visited', JSON.stringify([1, 2, 3]));
      assert.deepEqual(getVisited(), [1, 2, 3]);
    });

    it('returns empty array on corrupt JSON', () => {
      localStorage.setItem('pp_visited', '{broken');
      assert.deepEqual(getVisited(), []);
    });
  });

  describe('markVisited', () => {
    it('adds a location id', () => {
      markVisited(42);
      assert.deepEqual(getVisited(), [42]);
    });

    it('adds newest id at the front (unshift)', () => {
      markVisited(1);
      markVisited(2);
      assert.deepEqual(getVisited(), [2, 1]);
    });

    it('does not add duplicates', () => {
      markVisited(1);
      markVisited(1);
      assert.deepEqual(getVisited(), [1]);
    });

    it('caps at 200 entries', () => {
      for (let i = 1; i <= 205; i++) markVisited(i);
      const visited = getVisited();
      assert.equal(visited.length, 200);
      // newest (205) should be first, oldest entries (1-5) should be gone
      assert.equal(visited[0], 205);
      assert.ok(!visited.includes(1));
      assert.ok(!visited.includes(5));
      assert.ok(visited.includes(6));
    });
  });

  describe('isVisited', () => {
    it('returns false when nothing visited', () => {
      assert.equal(isVisited(1), false);
    });

    it('returns true for visited id', () => {
      markVisited(7);
      assert.equal(isVisited(7), true);
    });

    it('returns false for non-visited id', () => {
      markVisited(7);
      assert.equal(isVisited(8), false);
    });
  });
});

// ============================================================
// prefs.js — no external deps, direct import
// ============================================================
const { getPrefs, setPrefs, clearPrefs, hasCompletedOnboarding } = await import(resolve(rootDir, 'modules', 'prefs.js'));

describe('prefs module', () => {
  beforeEach(() => localStorage.clear());

  describe('getPrefs', () => {
    it('returns empty object when nothing stored', () => {
      assert.deepEqual(getPrefs(), {});
    });

    it('returns parsed object from localStorage', () => {
      localStorage.setItem('pp_prefs', JSON.stringify({ theme: 'dark' }));
      assert.deepEqual(getPrefs(), { theme: 'dark' });
    });

    it('returns empty object on corrupt JSON', () => {
      localStorage.setItem('pp_prefs', 'not-json');
      assert.deepEqual(getPrefs(), {});
    });

    it('returns empty object when stored value is null (JSON null)', () => {
      localStorage.setItem('pp_prefs', 'null');
      assert.deepEqual(getPrefs(), {});
    });
  });

  describe('setPrefs', () => {
    it('stores new preferences', () => {
      const result = setPrefs({ radius: 10 });
      assert.equal(result.radius, 10);
      assert.ok(result.lastUsed); // auto-set date
    });

    it('merges with existing preferences', () => {
      setPrefs({ radius: 10 });
      const result = setPrefs({ theme: 'dark' });
      assert.equal(result.radius, 10);
      assert.equal(result.theme, 'dark');
    });

    it('overwrites existing keys', () => {
      setPrefs({ radius: 10 });
      const result = setPrefs({ radius: 25 });
      assert.equal(result.radius, 25);
    });

    it('always sets lastUsed to today', () => {
      const result = setPrefs({ foo: 'bar' });
      const today = new Date().toISOString().slice(0, 10);
      assert.equal(result.lastUsed, today);
    });

    it('persists to localStorage', () => {
      setPrefs({ color: 'blue' });
      const stored = JSON.parse(localStorage.getItem('pp_prefs'));
      assert.equal(stored.color, 'blue');
    });
  });

  describe('clearPrefs', () => {
    it('removes prefs from localStorage', () => {
      setPrefs({ x: 1 });
      clearPrefs();
      assert.equal(localStorage.getItem('pp_prefs'), null);
    });

    it('does not throw when nothing to clear', () => {
      assert.doesNotThrow(() => clearPrefs());
    });
  });

  describe('hasCompletedOnboarding', () => {
    it('returns false when no prefs', () => {
      assert.equal(hasCompletedOnboarding(), false);
    });

    it('returns false when onboardingComplete is not set', () => {
      setPrefs({ radius: 10 });
      assert.equal(hasCompletedOnboarding(), false);
    });

    it('returns true when onboardingComplete is true', () => {
      setPrefs({ onboardingComplete: true });
      assert.equal(hasCompletedOnboarding(), true);
    });

    it('returns false when onboardingComplete is falsy', () => {
      setPrefs({ onboardingComplete: false });
      assert.equal(hasCompletedOnboarding(), false);
    });
  });
});

// ============================================================
// favorites.js — requires mocked state/bus/utils (via loader)
// ============================================================
const { getFavorites, isFavorite, toggleFavorite, getShortlistIds, clearShortlist, buildShortlistUrl } =
  await import(resolve(rootDir, 'modules', 'favorites.js'));

// Also import the mock state so we can mutate it in tests
const { state } = await import(resolve(rootDir, 'modules', 'state.js'));

describe('favorites module', () => {
  beforeEach(() => {
    localStorage.clear();
    state.activeTag = 'all';
    state.allLocations = [];
    state.sharedShortlistIds = [];
    state.activeLocSheet = null;
  });

  describe('getFavorites', () => {
    it('returns empty array when nothing stored', () => {
      assert.deepEqual(getFavorites(), []);
    });

    it('returns parsed array from localStorage', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([10, 20]));
      assert.deepEqual(getFavorites(), [10, 20]);
    });

    it('returns empty array on corrupt JSON', () => {
      localStorage.setItem('peuterplannen_favorites', 'broken!!');
      assert.deepEqual(getFavorites(), []);
    });
  });

  describe('isFavorite', () => {
    it('returns false when not in favorites', () => {
      assert.equal(isFavorite(1), false);
    });

    it('returns true when in favorites', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([5, 10]));
      assert.equal(isFavorite(10), true);
    });
  });

  describe('toggleFavorite', () => {
    it('adds a location to empty favorites', () => {
      toggleFavorite(42, null);
      assert.deepEqual(getFavorites(), [42]);
    });

    it('removes an existing favorite', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([42]));
      toggleFavorite(42, null);
      assert.deepEqual(getFavorites(), []);
    });

    it('toggle on then off returns to empty', () => {
      toggleFavorite(7, null);
      assert.equal(isFavorite(7), true);
      toggleFavorite(7, null);
      assert.equal(isFavorite(7), false);
    });

    it('can add multiple favorites', () => {
      toggleFavorite(1, null);
      toggleFavorite(2, null);
      toggleFavorite(3, null);
      assert.deepEqual(getFavorites(), [1, 2, 3]);
    });

    it('persists to localStorage', () => {
      toggleFavorite(99, null);
      const stored = JSON.parse(localStorage.getItem('peuterplannen_favorites'));
      assert.deepEqual(stored, [99]);
    });
  });

  describe('getShortlistIds', () => {
    it('returns favorites when no shared shortlist', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([1, 2]));
      state.sharedShortlistIds = [];
      assert.deepEqual(getShortlistIds(), [1, 2]);
    });

    it('returns shared shortlist ids when present', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([1, 2]));
      state.sharedShortlistIds = [10, 20];
      assert.deepEqual(getShortlistIds(), [10, 20]);
    });

    it('returns a copy (not reference) of shared ids', () => {
      state.sharedShortlistIds = [10, 20];
      const ids = getShortlistIds();
      ids.push(99);
      assert.deepEqual(state.sharedShortlistIds, [10, 20]); // original unchanged
    });
  });

  describe('buildShortlistUrl', () => {
    it('builds URL with given ids', () => {
      const url = buildShortlistUrl([1, 2, 3]);
      assert.ok(url.includes('ids=1%2C2%2C3') || url.includes('ids=1,2,3'));
    });

    it('filters out non-integer and negative ids', () => {
      const url = buildShortlistUrl([1, -5, 0, 3.5, 2]);
      // Should keep only 1 and 2 (positive integers)
      assert.ok(url.includes('ids='));
      assert.ok(!url.includes('-5'));
    });

    it('returns URL without ids param when all filtered out', () => {
      const url = buildShortlistUrl([-1, 0, 3.5]);
      assert.ok(!url.includes('ids='));
    });
  });

  describe('clearShortlist', () => {
    it('clears favorites from localStorage', () => {
      localStorage.setItem('peuterplannen_favorites', JSON.stringify([1, 2, 3]));
      state.sharedShortlistIds = [];
      clearShortlist();
      assert.equal(localStorage.getItem('peuterplannen_favorites'), null);
    });

    it('resets activeTag from favorites to all', () => {
      state.activeTag = 'favorites';
      state.sharedShortlistIds = [];
      clearShortlist();
      assert.equal(state.activeTag, 'all');
    });
  });
});
