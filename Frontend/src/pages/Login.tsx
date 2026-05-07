import { useEffect, useState } from "react";
import { login, me } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

type LoginPageProps = {
  onGoToRegister: () => void;
  onBackHome: () => void;
  onGoToVerify: (email?: string) => void;
  onGoToForgotPassword: (email?: string) => void;
  initialEmail?: string;
};

function getErrorMessage(data: any) {
  if (!data) return "Login failed";
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;

  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];

  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === "string") return value;

  return "Login failed";
}

export default function LoginPage({
  onGoToRegister,
  onBackHome,
  onGoToVerify,
  onGoToForgotPassword,
  initialEmail = "",
}: LoginPageProps) {
  const { setUser } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens = await login(email, password);
      localStorage.setItem("access", tokens.access);
      localStorage.setItem("refresh", tokens.refresh);

      const user = await me();
      setUser(user);
    } catch (err: any) {
      setError(getErrorMessage(err?.response?.data));
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
          <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 20 }}>
            Graduwayse
          </div>
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 430,
            }}
          >
            Discover opportunities, connect with employers, and manage your
            graduate career journey in one place.
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
            type="button"
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
            Sign in
          </div>

          <div style={{ marginTop: 8, color: "#64748b", fontSize: 16 }}>
            Welcome back. Enter your details to continue.
          </div>

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

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
                Password
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
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div style={{ marginTop: 10, textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => onGoToForgotPassword(email)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2563eb",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => onGoToVerify(email)}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
              }}
            >
              Need to verify your email?
            </button>
          </div>

          <div style={{ marginTop: 22, color: "#64748b" }}>
            New here?{" "}
            <button
              type="button"
              onClick={onGoToRegister}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
              }}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}