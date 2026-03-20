const bus = {
  _events: {},
  on(event, fn) { (this._events[event] ||= []).push(fn); },
  off(event, fn) { this._events[event] = (this._events[event] || []).filter(f => f !== fn); },
  emit(event, data) { (this._events[event] || []).forEach(fn => fn(data)); }
};
export default bus;
