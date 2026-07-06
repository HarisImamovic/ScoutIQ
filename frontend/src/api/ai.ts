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

export class AiAccessDeniedError extends Error {
  constructor(public detail: string) {
    super(detail);
    this.name = "AiAccessDeniedError";
  }
}

export interface AiAccessRequestMine {
  id: string | null;
  status: "pending" | "approved" | "rejected" | null;
  message: string | null;
  created_at: string | null;
}

export interface AiAccessRequestDetail {
  id: string;
  requester_name: string;
  requester_email: string;
  message: string;
  status: string;
  created_at: string;
}

export async function getMyAiAccessRequest(): Promise<AiAccessRequestMine> {
  const { data } = await client.get<AiAccessRequestMine>("/ai/access-requests/mine");
  return data;
}

export async function requestAiAccess(message: string): Promise<AiAccessRequestMine> {
  const { data } = await client.post<AiAccessRequestMine>("/ai/access-requests", { message });
  return data;
}

export async function getAiAccessRequest(id: string): Promise<AiAccessRequestDetail> {
  const { data } = await client.get<AiAccessRequestDetail>(`/ai/access-requests/${id}`);
  return data;
}

export async function reviewAiAccessRequest(
  id: string,
  action: "approve" | "reject",
): Promise<AiAccessRequestDetail> {
  const { data } = await client.post<AiAccessRequestDetail>(`/ai/access-requests/${id}/${action}`);
  return data;
}

export async function getAiUsage(): Promise<AiUsage> {
  try {
    const { data } = await client.get<AiUsage>("/ai/usage");
    return data;
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { detail?: string } } };
    if (e.response?.status === 403) {
      throw new AiAccessDeniedError(
        e.response.data?.detail ??
          "AI access has not been enabled for your account.",
      );
    }
    throw err;
  }
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
