/**
 * AI Client Utility for DUN MASTER
 * Handles API key storage, request forwarding, model fallbacks,
 * and client-side direct Gemini API fallback when the server is unavailable.
 */

const STORAGE_KEY_CUSTOM_API_KEY = 'custom_gemini_api_key';

export function getCustomGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_API_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}
  // Check Vite env
  try {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
  } catch (e) {}
  return '';
}

export function setCustomGeminiApiKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_API_KEY, clean);
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_API_KEY);
    }
  } catch (e) {}
}

export function clearCustomGeminiApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_API_KEY);
  } catch (e) {}
}

/**
 * Call direct Google Gemini REST API from client as a rock-solid fallback
 */
async function callDirectGeminiRest(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model = 'gemini-2.0-flash'
): Promise<string> {
  const models = [model, 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
  let lastErr: any = null;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      };

      if (systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Không thể gọi trực tiếp Gemini API.');
}

export interface AiRequestOptions {
  endpoint: string;
  payload: Record<string, any>;
  signal?: AbortSignal;
  systemPromptFallback?: string;
  userPromptFallback?: string;
}

export async function callAiApi<T = any>(options: AiRequestOptions): Promise<T> {
  const customKey = getCustomGeminiApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
  }

  const bodyPayload = {
    ...options.payload,
    ...(customKey ? { apiKey: customKey } : {}),
  };

  try {
    const res = await fetch(options.endpoint, {
      method: 'POST',
      headers,
      signal: options.signal,
      body: JSON.stringify(bodyPayload),
    });

    if (res.ok) {
      const data = await res.json();
      return data as T;
    }

    // Try parsing error response
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch (e) {
      errorData = { error: `Server returned ${res.status}` };
    }

    // Check if error is due to missing key or service blocked
    const errMsg = String(errorData?.error || errorData?.details || errorData?.reply || '');
    const isKeyIssue =
      errorData?.needsApiKey ||
      errMsg.includes('MISSING_API_KEY') ||
      errMsg.includes('GEMINI_API_KEY') ||
      errMsg.includes('API_KEY_SERVICE_BLOCKED') ||
      errMsg.includes('PERMISSION_DENIED');

    // If we have a custom key and fallback prompts, try direct call
    if (customKey && options.userPromptFallback) {
      try {
        const text = await callDirectGeminiRest(
          customKey,
          options.systemPromptFallback || '',
          options.userPromptFallback
        );
        return { reply: text, isError: false } as unknown as T;
      } catch (directErr) {
        console.warn('Direct Gemini REST fallback also failed:', directErr);
      }
    }

    const err = new Error(errMsg || `Lỗi máy chủ (${res.status})`);
    (err as any).needsApiKey = isKeyIssue;
    (err as any).status = res.status;
    (err as any).data = errorData;
    throw err;
  } catch (networkOrAbortErr: any) {
    if (networkOrAbortErr.name === 'AbortError') {
      throw networkOrAbortErr;
    }

    // If server is unreachable (e.g. 404 on static hosting, network down) and we have custom key
    if (customKey && options.userPromptFallback) {
      try {
        const text = await callDirectGeminiRest(
          customKey,
          options.systemPromptFallback || '',
          options.userPromptFallback
        );
        return { reply: text, isError: false } as unknown as T;
      } catch (directErr) {
        console.warn('Direct Gemini REST fallback on network failure failed:', directErr);
      }
    }

    throw networkOrAbortErr;
  }
}
