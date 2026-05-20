import client from "./client";

export async function sendChatMessage(message: string): Promise<string> {
  const { data } = await client.post<{ response: string }>(
    "/ai/chat",
    { message },
    { timeout: 60000 }
  );
  return data.response;
}
