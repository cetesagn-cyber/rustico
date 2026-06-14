const BASE = '/api/v1';

function getToken() {
  const token = sessionStorage.getItem('rustico_token') || localStorage.getItem('rustico_token');
  if (token && localStorage.getItem('rustico_token')) {
    sessionStorage.setItem('rustico_token', token);
    localStorage.removeItem('rustico_token');
  }
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();

  if (!text.trim()) {
    if (!res.ok) throw new Error(`Error ${res.status}: sin respuesta del servidor.`);
    return undefined as T;
  }

  let data: any;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Respuesta inválida del servidor (${res.status}).`); }

  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('rustico_token');
      localStorage.removeItem('rustico_token');
      window.dispatchEvent(new Event('rustico:auth-expired'));
    }
    throw new Error(data.message || `Error ${res.status}.`);
  }
  return data.data as T;
}

export const api = {
  get:    <T>(path: string)                      => request<T>(path),
  post:   <T>(path: string, body: unknown)       => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)       => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)       => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                      => request<T>(path, { method: 'DELETE' }),
};
