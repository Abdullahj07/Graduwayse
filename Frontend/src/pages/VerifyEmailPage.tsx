import { useEffect, useState } from "react";
import { resendVerification, verifyEmail } from "../api/auth";

type VerifyEmailPageProps = {
  initialEmail?: string;
  onVerified: (email: string) => void;
  onGoToLogin: () => void;
  onBackHome: () => void;
};

function getErrorMessage(data: any) {
  if (!data) return "Verification failed.";
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;

  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];

  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === "string") return value;

  return "Verification failed.";
}

export default function VerifyEmailPage({
  initialEmail = "",
  onVerified,
  onGoToLogin,
  onBackHome,
}: VerifyEmailPageProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    initialEmail
      ? `We sent a 6-digit code to ${initialEmail}. Check your Django terminal in development.`
      : null
  );

  useEffect(() => {
    setEmail(initialEmail);
    if (initialEmail) {
      setInfo(`We sent a 6-digit code to ${initialEmail}. Check your Django terminal in development.`);
    }
  }, [initialEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      await verifyEmail(email, code);
      setInfo("Email verified successfully. You can now sign in.");
      onVerified(email);
    } catch (err: any) {
      setError(getErrorMessage(err?.response?.data));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const res = await resendVerification(email);
      setInfo(res.detail);
    } catch (err: any) {
      setError(getErrorMessage(err?.response?.data));
    } finally {
      setResending(false);
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
          maxWidth: 1140,
          minHeight: 620,
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #1d4ed8 100%)",
            color: "#fff",
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 20 }}>Graduwayse</div>
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 430,
            }}
          >
            Verify your email to activate your account and continue securely.
          </div>
        </div>

        <div
          style={{
            padding: "56px 60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onBackHome}
            style={{
              alignSelf: "flex-start",
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
            Verify your email
          </div>

          <div style={{ marginTop: 8, color: "#64748b", fontSize: 16 }}>
            Enter the 6-digit code sent to your email address.
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>Email</div>
              <input
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
                Verification code
              </div>
              <input
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                  letterSpacing: "0.3em",
                }}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            {info && (
              <div
                style={{
                  color: "#166534",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                {info}
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
              {loading ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onResend}
              disabled={resending || !email}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "12px 14px",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {resending ? "Sending..." : "Resend code"}
            </button>

            <button
              onClick={onGoToLogin}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
              }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}