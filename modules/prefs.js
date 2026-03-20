// Lightweight user preference persistence (localStorage)
const PREFS_KEY = 'pp_prefs';

export function getPrefs() {
    try {
        return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    } catch { return {}; }
}

export function setPrefs(updates) {
    const current = getPrefs();
    const merged = { ...current, ...updates, lastUsed: new Date().toISOString().slice(0, 10) };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(merged)); } catch {}
    return merged;
}

export function clearPrefs() {
    try { localStorage.removeItem(PREFS_KEY); } catch {}
}

export function hasCompletedOnboarding() {
    return getPrefs().onboardingComplete === true;
}
