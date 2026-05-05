import { useEffect, useState } from "react";
import { register } from "../api/auth";

type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  role: "GRADUATE" | "EMPLOYER";
  phone_number?: string;
};

type RegisterPageProps = {
  onGoToLogin: () => void;
  onBackHome: () => void;
  onRegistered: (email: string) => void;
  initialRole?: RegisterPayload["role"];
};

function getErrorMessage(data: any) {
  if (!data) return "Registration failed.";
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;

  const parts: string[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      parts.push(`${key}: ${value.join(", ")}`);
    } else if (typeof value === "string") {
      parts.push(`${key}: ${value}`);
    }
  });

  return parts.length ? parts.join("\n") : "Registration failed.";
}

export default function RegisterPage({
  onGoToLogin,
  onBackHome,
  onRegistered,
  initialRole = "GRADUATE",
}: RegisterPageProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RegisterPayload["role"]>(initialRole);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await register({
        email,
        password,
        full_name: fullName,
        role,
        phone_number: phoneNumber.trim(),
      });

      setSuccess(res.detail);
      onRegistered(email);
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
          minHeight: 650,
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
            Create your account and start exploring graduate jobs, student
            profiles, and employer connections.
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

          <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>Create account</div>
          <div style={{ marginTop: 8, color: "#64748b", fontSize: 16 }}>
            Join as a graduate or employer.
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 28 }}>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>Full name</div>
              <input
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>Account type</div>
              <select
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                  background: "#fff",
                }}
                value={role}
                onChange={(e) => setRole(e.target.value as RegisterPayload["role"])}
              >
                <option value="GRADUATE">Graduate</option>
                <option value="EMPLOYER">Employer</option>
              </select>
            </div>

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
                Phone number
              </div>
              <input
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                }}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Optional for now"
              />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>Password</div>
              <input
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding: "14px 16px",
                  outline: "none",
                }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.5,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              After creating your account, you will need to verify your email before
              signing in.
            </div>

            {success && (
              <div
                style={{
                  color: "#166534",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {success}
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
                  whiteSpace: "pre-wrap",
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
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div style={{ marginTop: 22, color: "#64748b" }}>
            Already have an account?{" "}
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
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}