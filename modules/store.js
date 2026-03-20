// Tiny reactive store — replaces window._pp_modules over time
function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();
  return {
    get: (key) => state[key],
    set: (key, val) => { state[key] = val; listeners.forEach(fn => fn(key, val)); },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

export const store = createStore({ sheet: 'peek', view: 'discover', filters: [] });
