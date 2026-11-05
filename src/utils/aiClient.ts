import {projectStorage as localStorage} from './projectStorage';
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
  model = 'gemini-2.5-flash'
): Promise<string> {
  const models = [model, 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-3.1-pro-preview'];
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

// ---------------- Lưu lại câu trả lời AI đã sinh ----------------
// Cùng một câu hỏi + cùng yêu cầu → dùng lại lời giải thích cũ, không gọi AI lần nữa
// (nhanh hơn và đỡ tốn lượt gọi). Chỉ áp dụng cho giải thích / gia sư ngữ pháp.
const AI_CACHE_KEY = 'dun_ai_cache_v1';
const AI_CACHE_MAX = 200;
const AI_CACHE_DAYS = 30;
const CACHEABLE = new Set(['/api/ai/explain', '/api/ai/grammar-tutor']);

const cacheKeyOf = (endpoint: string, payload: Record<string, any>) => {
  const { apiKey, ...rest } = payload || {};
  const str = endpoint + '|' + JSON.stringify(rest);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}_${str.length}`;
};

type CacheEntry = { t: number; v: any };
const readCache = (): Record<string, CacheEntry> => {
  try {
    return JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

export function getCachedAiReply(endpoint: string, payload: Record<string, any>): any | null {
  if (!CACHEABLE.has(endpoint)) return null;
  const e = readCache()[cacheKeyOf(endpoint, payload)];
  if (!e || Date.now() - e.t > AI_CACHE_DAYS * 86400000) return null;
  return e.v;
}

function putCachedAiReply(endpoint: string, payload: Record<string, any>, value: any) {
  if (!CACHEABLE.has(endpoint) || !value || value.isError || !value.reply) return;
  try {
    const c = readCache();
    c[cacheKeyOf(endpoint, payload)] = { t: Date.now(), v: value };
    const keys = Object.keys(c);
    if (keys.length > AI_CACHE_MAX) {
      keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - AI_CACHE_MAX).forEach((k) => delete c[k]);
    }
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(c));
  } catch {}
}

export function clearAiCache() {
  try {
    localStorage.removeItem(AI_CACHE_KEY);
  } catch {}
}

/**
 * Gọi AI và hiện chữ dần trong lúc AI đang viết (stream). Máy chủ không hỗ trợ stream
 * hoặc lỗi → tự chuyển sang cách gọi thường.
 */
export async function callAiApiStream(
  options: AiRequestOptions & { noCache?: boolean },
  onText: (textSoFar: string) => void
): Promise<{ reply: string; isError?: boolean; cached?: boolean }> {
  if (!options.noCache) {
    const hit = getCachedAiReply(options.endpoint, options.payload);
    if (hit) {
      onText(hit.reply);
      return { ...hit, cached: true };
    }
  }
  const customKey = getCustomGeminiApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (customKey) headers['x-gemini-api-key'] = customKey;
  try {
    const res = await fetch(`${options.endpoint}?stream=1`, {
      method: 'POST',
      headers,
      signal: options.signal,
      body: JSON.stringify({ ...options.payload, ...(customKey ? { apiKey: customKey } : {}) }),
    });
    const type = res.headers.get('content-type') || '';
    if (res.ok && res.body && type.startsWith('text/plain')) {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        onText(acc);
      }
      acc += dec.decode();
      const isError = acc.startsWith('⚠️');
      const out = { reply: acc.trim(), isError };
      if (!options.noCache) putCachedAiReply(options.endpoint, options.payload, out);
      return out;
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
  }
  const data = await callAiApi<any>({ ...options, noCache: true } as any);
  if (data?.reply) onText(data.reply);
  if (!options.noCache) putCachedAiReply(options.endpoint, options.payload, data);
  return data;
}

export async function callAiApi<T = any>(options: AiRequestOptions & { noCache?: boolean }): Promise<T> {
  if (!options.noCache) {
    const hit = getCachedAiReply(options.endpoint, options.payload);
    if (hit) return hit as T;
  }
  const data = await callAiApiRaw<T>(options);
  if (!options.noCache) putCachedAiReply(options.endpoint, options.payload, data);
  return data;
}

async function callAiApiRaw<T = any>(options: AiRequestOptions): Promise<T> {
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
    const errMsg = String(errorData?.details || errorData?.error || errorData?.reply || '');
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
