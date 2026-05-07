import { useState } from "react";
import { api } from "../api/client";

type ForgotPasswordPageProps = {
  initialEmail?: string;
  onBackToLogin: () => void;
  onBackHome: () => void;
};

export default function ForgotPasswordPage({
  initialEmail = "",
  onBackToLogin,
  onBackHome,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api.post("/auth/password-reset/request/", {
        email,
      });

      setMessage(
        response.data?.detail ||
          "If an account exists with that email, a password reset link has been sent."
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to request password reset. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        background: "#dfe7f3",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 24,
          padding: "48px 52px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
        }}
      >
        <button
          type="button"
          onClick={onBackHome}
          style={{
            border: "none",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
            padding: 0,
            marginBottom: 16,
          }}
        >
          ← Back
        </button>

        <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
          Forgot password
        </div>

        <p style={{ marginTop: 8, color: "#64748b", fontSize: 16, lineHeight: 1.6 }}>
          Enter your email address and we will send you a password reset link.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
              Email
            </div>
            <input
              style={{
                width: "100%",
                border: "1px solid #dbe3ef",
                borderRadius: 14,
                padding: "14px 16px",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {message && (
            <div
              style={{
                color: "#166534",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 12,
                padding: "12px 14px",
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              border: "none",
              borderRadius: 14,
              padding: "14px 16px",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: 22, color: "#64748b" }}>
          Remember your password?{" "}
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              cursor: "pointer",
              padding: 0,
              fontWeight: 600,
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}