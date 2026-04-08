import client from "./client";

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  club_id: string | null;
  avatar_url: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    client.post<AuthUser>("/auth/register", payload),

  login: (payload: LoginPayload) =>
    client.post<TokenPair>("/auth/login", payload),

  logout: (refreshToken: string) =>
    client.post("/auth/logout", { refresh_token: refreshToken }),

  me: () => client.get<AuthUser>("/auth/me"),
};
