import type { CSSProperties } from "react";

type Role = "GRADUATE" | "EMPLOYER";

type HomePageProps = {
  onSelectRole: (role: Role) => void;
  onGoToLogin: () => void;
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px",
  background: "#dfe7f3",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1140,
  minHeight: 560,
  background: "#fff",
  borderRadius: 24,
  overflow: "hidden",
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
};

const leftStyle: CSSProperties = {
  background: "linear-gradient(135deg, #4f46e5 0%, #1d4ed8 100%)",
  color: "#fff",
  padding: "64px 56px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const rightStyle: CSSProperties = {
  padding: "56px 60px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  background: "#ffffff",
};

const roleCardStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 20,
  background: "#fff",
  padding: "22px 24px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
};

function FeatureItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "999px",
          background: "rgba(255,255,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: 16, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function RoleCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={roleCardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#a5b4fc";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#dbe3ef";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "999px",
          background: "#eef2ff",
          color: "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <div style={{ marginTop: 4, color: "#64748b", fontSize: 15 }}>{subtitle}</div>
      </div>
    </button>
  );
}

export default function HomePage({ onSelectRole, onGoToLogin }: HomePageProps) {
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={leftStyle}>
          <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 24 }}>Graduwayse</div>

          <div
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 430,
              marginBottom: 42,
            }}
          >
            Your pathway to graduate success. Connect students with their dream
            employers.
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <FeatureItem text="Thousands of graduate opportunities" />
            <FeatureItem text="Direct communication with employers" />
            <FeatureItem text="Easy application tracking" />
          </div>
        </div>

        <div style={rightStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Welcome Back</div>
          <div style={{ marginTop: 8, color: "#64748b", fontSize: 18 }}>
            Sign in to continue your journey
          </div>

          <div style={{ marginTop: 34, fontWeight: 600, color: "#334155" }}>I am a:</div>

          <div style={{ display: "grid", gap: 20, marginTop: 18 }}>
            <RoleCard
              title="Student"
              subtitle="Looking for graduate opportunities"
              icon="🎓"
              onClick={() => onSelectRole("GRADUATE")}
            />

            <RoleCard
              title="Employer"
              subtitle="Hiring talented graduates"
              icon="🏢"
              onClick={() => onSelectRole("EMPLOYER")}
            />
          </div>

          <div style={{ marginTop: 28, color: "#64748b", fontSize: 15 }}>
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