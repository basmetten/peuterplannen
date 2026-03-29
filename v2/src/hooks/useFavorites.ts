'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { trackFavoriteToggle } from '@/lib/analytics';

const STORAGE_KEY = 'pp-favorites';

// --- External store for localStorage-backed favorites ---

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  // Sync across tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function emitChange(): void {
  listeners.forEach((l) => l());
}

function getSnapshot(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((n): n is number => typeof n === 'number'));
    return new Set();
  } catch {
    return new Set();
  }
}

const emptySet = new Set<number>();

function getServerSnapshot(): Set<number> {
  return emptySet;
}

// Cache the snapshot to avoid creating new Set instances on every render
let cachedRaw: string | null = null;
let cachedSet: Set<number> = emptySet;

function getCachedSnapshot(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSet = getSnapshot();
    }
    return cachedSet;
  } catch {
    return emptySet;
  }
}

function writeFavorites(ids: Set<number>): void {
  try {
    const raw = JSON.stringify([...ids]);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSet = ids;
  } catch {
    // localStorage full or unavailable — silently fail
  }
  emitChange();
}

// --- Hook ---

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getCachedSnapshot, getServerSnapshot);

  const isFavorite = useCallback(
    (id: number): boolean => favorites.has(id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (id: number): void => {
      const current = getSnapshot();
      const wasPresent = current.has(id);
      if (wasPresent) {
        current.delete(id);
      } else {
        current.add(id);
      }
      writeFavorites(current);
      trackFavoriteToggle(id, wasPresent ? 'remove' : 'add', current.size);
    },
    [],
  );

  return {
    favorites,
    count: favorites.size,
    isFavorite,
    toggleFavorite,
  };
}
