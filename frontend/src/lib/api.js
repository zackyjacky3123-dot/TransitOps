const STORAGE_KEY = 'transitops_auth';

function getToken() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

// Drop-in replacement for fetch() that attaches the logged-in user's JWT to
// every request and sends the caller straight back to /login if the session
// has expired or was rejected by the API.
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return response;
}
