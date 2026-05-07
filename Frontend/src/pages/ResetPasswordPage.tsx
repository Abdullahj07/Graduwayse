import { useState } from "react";
import { api } from "../api/client";

type ResetPasswordPageProps = {
  uid: string;
  token: string;
  onBackToLogin: () => void;
};

export default function ResetPasswordPage({
  uid,
  token,
  onBackToLogin,
}: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(
        response.data?.detail ||
          "Password reset successfully. You can now sign in."
      );

      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to reset password. The link may be invalid or expired."
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
        <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
          Reset password
        </div>

        <p style={{ marginTop: 8, color: "#64748b", fontSize: 16, lineHeight: 1.6 }}>
          Enter and confirm your new password.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
              New password
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
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600, color: "#334155" }}>
              Confirm password
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
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {success && (
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
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div style={{ marginTop: 22 }}>
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
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}