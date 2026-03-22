// Custom loader hook that intercepts modules/state.js imports
// and returns a mock with the exported constants that utils.js needs.

export async function resolve(specifier, context, nextResolve) {
  // Intercept any import that ends with /state.js from our modules dir
  if (specifier.endsWith('./state.js') || specifier.endsWith('/modules/state.js')) {
    return {
      shortCircuit: true,
      url: 'mock:state',
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'mock:state') {
    return {
      shortCircuit: true,
      format: 'module',
      source: `
        export const SB_KEY = 'mock-key';
        export const SB_EVENTS_URL = 'https://mock.supabase.co/rest/v1/events';
      `,
    };
  }
  return nextLoad(url, context);
}
