export const debugLifecycle = {
  log: (event, details = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`%c[LIFECYCLE] ${event}`, 'color: #8b5cf6; font-weight: bold;', { timestamp, ...details });
  },
  mount: (componentName) => {
    debugLifecycle.log(`Page mounted: ${componentName}`);
  },
  unmount: (componentName) => {
    debugLifecycle.log(`Page unmounted: ${componentName}`);
  },
  dataLoaded: (componentName, data = {}) => {
    debugLifecycle.log(`Data loaded: ${componentName}`, data);
  },
  dataFailed: (componentName, error) => {
    console.error(`%c[LIFECYCLE ERROR] Data failed: ${componentName}`, 'color: #ef4444; font-weight: bold;', { timestamp: new Date().toISOString(), error });
  },
  authResolved: (role) => {
    debugLifecycle.log('Auth resolved', { role });
  },
  authFailed: (error) => {
    console.error(`%c[LIFECYCLE ERROR] Auth failed`, 'color: #ef4444; font-weight: bold;', { timestamp: new Date().toISOString(), error });
  },
  realtimeConnected: (channelName) => {
    debugLifecycle.log(`Realtime connected: ${channelName}`);
  },
  realtimeDisconnected: (channelName) => {
    debugLifecycle.log(`Realtime disconnected: ${channelName}`);
  }
};
