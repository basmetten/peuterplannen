'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { trackPlanToggle } from '@/lib/analytics';

const STORAGE_KEY = 'pp-plan';

// --- External store for localStorage-backed plan (ordered list) ---

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

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

function readPlan(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((n): n is number => typeof n === 'number');
    return [];
  } catch {
    return [];
  }
}

const emptyList: number[] = [];

function getServerSnapshot(): number[] {
  return emptyList;
}

// Cache to avoid new array instances on every render
let cachedRaw: string | null = null;
let cachedList: number[] = emptyList;

function getCachedSnapshot(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedList = readPlan();
    }
    return cachedList;
  } catch {
    return emptyList;
  }
}

function writePlan(ids: number[]): void {
  try {
    const raw = JSON.stringify(ids);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedList = ids;
  } catch {
    // localStorage full or unavailable
  }
  emitChange();
}

// --- Hook ---

export function usePlan() {
  const planIds = useSyncExternalStore(subscribe, getCachedSnapshot, getServerSnapshot);

  const isInPlan = useCallback(
    (id: number): boolean => planIds.includes(id),
    [planIds],
  );

  const addToPlan = useCallback((id: number): void => {
    const current = readPlan();
    if (!current.includes(id)) {
      writePlan([...current, id]);
      trackPlanToggle(id, 'add');
    }
  }, []);

  const removeFromPlan = useCallback((id: number): void => {
    const current = readPlan();
    writePlan(current.filter((i) => i !== id));
    trackPlanToggle(id, 'remove');
  }, []);

  const moveUp = useCallback((id: number): void => {
    const current = readPlan();
    const idx = current.indexOf(id);
    if (idx <= 0) return;
    const next = [...current];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    writePlan(next);
  }, []);

  const moveDown = useCallback((id: number): void => {
    const current = readPlan();
    const idx = current.indexOf(id);
    if (idx < 0 || idx >= current.length - 1) return;
    const next = [...current];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    writePlan(next);
  }, []);

  const clearPlan = useCallback((): void => {
    writePlan([]);
  }, []);

  return {
    planIds,
    count: planIds.length,
    isInPlan,
    addToPlan,
    removeFromPlan,
    moveUp,
    moveDown,
    clearPlan,
  };
}
