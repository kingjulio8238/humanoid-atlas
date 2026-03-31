const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://brokerage.humanoids.fyi/v1';

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // Add anonymous cart ID
  const anonId = getAnonymousId();
  if (anonId) headers['x-anonymous-id'] = anonId;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `API error: ${res.status}`);
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

function getAnonymousId(): string {
  let id = localStorage.getItem('db_anonymous_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('db_anonymous_id', id);
  }
  return id;
}

export function getAnonId(): string {
  return getAnonymousId();
}
