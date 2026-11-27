const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'agenda-facil.token';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Errores de validación por campo: { campo: mensaje } */
  get fieldErrors() {
    const out = {};
    if (Array.isArray(this.details)) {
      this.details.forEach((d) => {
        if (d.field && !out[d.field]) out[d.field] = d.message;
      });
    }
    return out;
  }
}

export const tokenStore = {
  get() {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible (modo privado, etc.) */
    }
  },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export async function request(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`${BASE_URL}/api${path}`, window.location.origin);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data && data.error) || {};
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, e.code || 'HTTP_ERROR', e.message || `Error ${res.status}`, e.details);
  }
  return data;
}

export const api = {
  get: (path, query, opts) => request(path, { ...opts, query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
