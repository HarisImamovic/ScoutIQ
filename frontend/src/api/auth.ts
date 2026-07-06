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
  token_type: string;
}

export interface LoginResponse {
  access_token: string | null;
  token_type: string;
  mfa_required: boolean;
  mfa_setup_required: boolean;
  mfa_token: string | null;
  methods: string[];
  sms_available: boolean;
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
  has_password: boolean;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    client.post<AuthUser>("/auth/register", payload),

  login: (payload: LoginPayload) =>
    client.post<LoginResponse>("/auth/login", payload),

  logout: () =>
    client.post("/auth/logout"),

  refresh: () =>
    client.post<TokenPair>("/auth/refresh"),

  me: () => client.get<AuthUser>("/auth/me"),

  updateProfile: (payload: UpdateProfilePayload) =>
    client.put<AuthUser>("/auth/me", payload),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.post<void>("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  googleCallback: (code: string, codeVerifier: string) =>
    client.post<LoginResponse>("/auth/google/callback", {
      code,
      code_verifier: codeVerifier,
    }),
};
