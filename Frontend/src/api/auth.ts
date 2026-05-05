import { api } from "./client";

export type LoginResponse = {
  access: string;
  refresh: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  role: "EMPLOYER" | "GRADUATE";
  phone_number?: string;
};

export type RegisterResponse = {
  detail: string;
  email: string;
  email_verified: boolean;
};

export type VerifyEmailResponse = {
  detail: string;
};

export type ResendVerificationResponse = {
  detail: string;
};

export type MeResponse = {
  id: number;
  email: string;
  full_name: string;
  role: "EMPLOYER" | "GRADUATE";
  email_verified: boolean;
  phone_number: string;
  phone_verified: boolean;
  has_seen_cv_visibility_notice: boolean;
};

export async function register(payload: RegisterPayload) {
  const res = await api.post<RegisterResponse>("/auth/register/", payload);
  return res.data;
}

export async function verifyEmail(email: string, code: string) {
  const res = await api.post<VerifyEmailResponse>("/auth/verify-email/", {
    email,
    code,
  });
  return res.data;
}

export async function resendVerification(email: string) {
  const res = await api.post<ResendVerificationResponse>("/auth/resend-verification/", {
    email,
  });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post<LoginResponse>("/auth/login/", { email, password });
  return res.data;
}

export async function me() {
  const res = await api.get<MeResponse>("/auth/me/");
  return res.data;
}

