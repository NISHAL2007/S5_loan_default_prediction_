const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function tryForwardToBackend(
  endpoint: string, 
  method: string = 'GET', 
  body?: any,
  timeoutMs: number = 3000
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      cache: 'no-store'
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    } else {
      const errText = await res.text();
      return { success: false, error: `Backend HTTP ${res.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Backend unreachable' };
  }
}
