import client from "./client";

export interface TelegramStatus {
  connected: boolean;
}

export interface TelegramLinkCode {
  code: string;
  expires_at: string;
  bot_username: string;
}

export const telegramApi = {
  getStatus: (): Promise<TelegramStatus> =>
    client.get<TelegramStatus>("/telegram/status").then((r) => r.data),

  generateCode: (): Promise<TelegramLinkCode> =>
    client.post<TelegramLinkCode>("/telegram/generate-code").then((r) => r.data),

  disconnect: (): Promise<void> =>
    client.delete("/telegram/disconnect").then(() => undefined),
};
