const VISITED_KEY = 'pp_visited';
const MAX_VISITED = 200;

export function markVisited(locationId) {
    const visited = getVisited();
    if (!visited.includes(locationId)) {
        visited.unshift(locationId);
        if (visited.length > MAX_VISITED) visited.pop();
        try { localStorage.setItem(VISITED_KEY, JSON.stringify(visited)); } catch {}
    }
}

export function getVisited() {
    try {
        return JSON.parse(localStorage.getItem(VISITED_KEY)) || [];
    } catch { return []; }
}

export function isVisited(locationId) {
    return getVisited().includes(locationId);
}
