const BASE_URL = 'http://localhost:3000';

export async function firerustFetch(endpoint: string, options: any = {}) {
  const { token, adminKey, ...rest } = options;
  
  const headers: Record<string, string> = {
    ...(!(rest.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(adminKey && { 'X-Admin-Key': adminKey }),
    ...rest.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...rest, headers });
  
  if (response.status === 204) return null;
  const data = await response.json();
  
  if (!response.ok) throw new Error(data.error || 'Server Error');
  return data;
}