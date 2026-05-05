// src/types/authTypes.ts

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  full_name?: string;
  role: "GRADUATE" | "EMPLOYER";
}
