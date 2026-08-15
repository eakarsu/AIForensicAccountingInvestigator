const configuredBase = process.env.REACT_APP_API_BASE?.trim();
const apiPort = process.env.REACT_APP_API_PORT || '3001';

const runtimeBase = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:${apiPort}/api`
  : `http://127.0.0.1:${apiPort}/api`;

const apiBase = configuredBase || runtimeBase;

export default apiBase.replace(/\/$/, '');
