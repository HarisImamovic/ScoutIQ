import client, { clearTokens, getAccessToken, setAccessToken } from "./client";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface AiHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiUsage {
  requests_today: number;
  daily_limit: number;
  remaining: number;
}

export type StreamEvent =
  | { chunk: string }
  | { done: true; remaining: number }
  | { error: "rate_limit" | "timeout" | "service_unavailable" };

export async function getAiUsage(): Promise<AiUsage> {
  const { data } = await client.get<AiUsage>("/ai/usage");
  return data;
}

async function* _doStream(
  message: string,
  history: AiHistoryMessage[],
  token: string | null,
  signal: AbortSignal
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error("http_error"), {
      status: response.status,
      detail: (body as { detail?: string }).detail ?? "",
    });
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      try {
        yield JSON.parse(part.slice(6)) as StreamEvent;
      } catch {
        // ignore malformed SSE frame
      }
    }
  }
}

export async function* streamChatMessage(
  message: string,
  history: AiHistoryMessage[],
  signal: AbortSignal
): AsyncGenerator<StreamEvent> {
  const token = getAccessToken();

  try {
    yield* _doStream(message, history, token, signal);
  } catch (err: unknown) {
    const e = err as { status?: number; detail?: string; name?: string };
    if (e.status !== 401) throw err;

    try {
      const resp = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        signal,
      });
      if (resp.ok) {
        const json = (await resp.json()) as { access_token: string };
        setAccessToken(json.access_token);
        yield* _doStream(message, history, json.access_token, signal);
        return;
      }
    } catch {
      // refresh failed
    }

    clearTokens();
    window.location.replace("/login");
  }
}
