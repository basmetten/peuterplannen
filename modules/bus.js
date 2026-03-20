const listeners = {};
export const bus = {
  on(event, fn) { (listeners[event] ??= []).push(fn); },
  off(event, fn) { listeners[event] = listeners[event]?.filter(f => f !== fn); },
  emit(event, ...args) { listeners[event]?.forEach(fn => fn(...args)); }
};
export default bus;
