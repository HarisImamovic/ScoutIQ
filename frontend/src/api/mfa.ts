import client from "./client";

export interface MfaMethodStatus {
  method: string;
  confirmed: boolean;
  destination: string | null;
}

export interface MfaStatus {
  methods: MfaMethodStatus[];
  sms_available: boolean;
  recovery_codes_remaining: number;
}

export interface MfaTotpSetup {
  secret: string;
  otpauth_uri: string;
  qr_data_uri: string;
}

export interface MfaConfirmResult {
  access_token: string | null;
  recovery_codes: string[] | null;
}

export interface MfaLoginComplete {
  access_token: string;
}

export interface MfaReauthPayload {
  password?: string;
  code?: string;
}

const withToken = (token?: string) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

export const mfaApi = {
  status: (token?: string) =>
    client.get<MfaStatus>("/auth/mfa/status", withToken(token)),

  challenge: (method: string, token: string) =>
    client.post<void>("/auth/mfa/challenge", { method }, withToken(token)),

  manageChallenge: (method: string) =>
    client.post<void>("/auth/mfa/manage/challenge", { method }),

  verify: (method: string, code: string, token: string) =>
    client.post<MfaLoginComplete>("/auth/mfa/verify", { method, code }, withToken(token)),

  recovery: (code: string, token: string) =>
    client.post<MfaLoginComplete>("/auth/mfa/recovery", { code }, withToken(token)),

  setupTotp: (token?: string) =>
    client.post<MfaTotpSetup>("/auth/mfa/setup/totp", {}, withToken(token)),

  confirmTotp: (code: string, token?: string) =>
    client.post<MfaConfirmResult>("/auth/mfa/setup/totp/confirm", { code }, withToken(token)),

  setupEmail: (token?: string) =>
    client.post<void>("/auth/mfa/setup/email", {}, withToken(token)),

  confirmEmail: (code: string, token?: string) =>
    client.post<MfaConfirmResult>("/auth/mfa/setup/email/confirm", { code }, withToken(token)),

  setupSms: (phoneNumber: string, token?: string) =>
    client.post<void>("/auth/mfa/setup/sms", { phone_number: phoneNumber }, withToken(token)),

  confirmSms: (code: string, token?: string) =>
    client.post<MfaConfirmResult>("/auth/mfa/setup/sms/confirm", { code }, withToken(token)),

  removeMethod: (method: string, payload: MfaReauthPayload) =>
    client.post<void>(`/auth/mfa/methods/${method}/remove`, payload),

  regenerateRecoveryCodes: (payload: MfaReauthPayload) =>
    client.post<{ recovery_codes: string[] }>("/auth/mfa/recovery-codes/regenerate", payload),
};
