// Custom ESM loader that intercepts dependencies for favorites.js testing.
// Mocks: state.js, bus.js, utils.js (trackEvent, ppToast, buildDetailUrl)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('./state.js') || specifier.endsWith('/modules/state.js')) {
    return { shortCircuit: true, url: 'mock:state' };
  }
  if (specifier.endsWith('./bus.js') || specifier.endsWith('/modules/bus.js')) {
    return { shortCircuit: true, url: 'mock:bus' };
  }
  if (specifier.endsWith('./utils.js') || specifier.endsWith('/modules/utils.js')) {
    return { shortCircuit: true, url: 'mock:utils' };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'mock:state') {
    return {
      shortCircuit: true,
      format: 'module',
      source: `
        export const state = {
          activeTags: [],
          activeFavorites: false,
          allLocations: [],
          sharedShortlistIds: [],
          activeLocSheet: null,
        };
        Object.defineProperty(state, 'activeTag', {
          get() {
            if (state.activeFavorites) return 'favorites';
            if (state.activeTags.length === 1) return state.activeTags[0];
            if (state.activeTags.length === 0) return 'all';
            return state.activeTags[0];
          },
          set(val) {
            if (val === 'favorites') { state.activeFavorites = true; }
            else if (val === 'all') { state.activeTags = []; state.activeFavorites = false; }
            else { state.activeTags = [val]; state.activeFavorites = false; }
          },
          enumerable: true, configurable: true,
        });
      `,
    };
  }
  if (url === 'mock:bus') {
    return {
      shortCircuit: true,
      format: 'module',
      source: `
        const listeners = {};
        const bus = {
          on(event, fn) { (listeners[event] ??= []).push(fn); },
          off(event, fn) { listeners[event] = listeners[event]?.filter(f => f !== fn); },
          emit(event, ...args) { listeners[event]?.forEach(fn => fn(...args)); },
        };
        export { bus };
        export default bus;
      `,
    };
  }
  if (url === 'mock:utils') {
    return {
      shortCircuit: true,
      format: 'module',
      source: `
        export function trackEvent() {}
        export function ppToast() {}
        export function buildDetailUrl(item) { return '/loc/' + item.id; }
      `,
    };
  }
  return nextLoad(url, context);
}
