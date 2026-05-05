import { useState } from "react";
import {
  FiBriefcase,
  FiGrid,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { api } from "./api/client";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import HomePage from "./pages/HomePage";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerStudentsPage from "./pages/EmployerStudentsPage";
import EmployerJobApplicantsPage from "./pages/EmployerJobApplicantsPage";
import GraduateProfilePage from "./pages/GraduateProfilePage";
import DirectMessagesPage from "./pages/DirectMessagesPage";
import InternalJobsPage from "./pages/InternalJobsPage";
import AdzunaJobsPage from "./pages/AdzunaJobsPage";
import ReedJobsPage from "./pages/ReedJobsPage";
import MyApplications from "./pages/MyApplications";
import ChatsPage from "./pages/ChatsPage";
import { styles } from "./ui/ui";

type AuthScreen = "home" | "login" | "register" | "verify_email";
type Role = "GRADUATE" | "EMPLOYER";

type GraduateScreen =
  | "internal_jobs"
  | "adzuna_jobs"
  | "reed_jobs"
  | "applications"
  | "profile"
  | "messages"
  | "chats";

type EmployerScreen =
  | "dashboard"
  | "students"
  | "messages"
  | "chats"
  | "job_applicants";

function NavBtn({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      style={active ? styles.navButtonActive : styles.navButton}
      onClick={onClick}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon}
        {label}
      </span>
    </button>
  );
}

function CvVisibilityNoticeModal({
  open,
  loading,
  error,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: "#eff6ff",
            color: "#2563eb",
            fontWeight: 800,
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          <FiShield size={16} />
          Visibility notice
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          Important CV visibility notice
        </div>

        <div style={{ color: "#475569", lineHeight: 1.7 }}>
          Employers can view your graduate profile and CV even if you have not
          applied to their jobs. Your CV visibility is not restricted only to
          employers for jobs you apply to.
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          By continuing, you confirm that you understand that employers on the
          platform may browse and review your profile and CV.
        </div>

        {error && <div style={{ ...styles.errorBox, marginTop: 14 }}>{error}</div>}

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            style={styles.buttonPrimary}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Saving..." : "I understand"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, logout, setUser } = useAuth();

  const [authScreen, setAuthScreen] = useState<AuthScreen>("home");
  const [selectedAuthRole, setSelectedAuthRole] = useState<Role>("GRADUATE");
  const [verificationEmail, setVerificationEmail] = useState("");

  const [graduateScreen, setGraduateScreen] =
    useState<GraduateScreen>("internal_jobs");
  const [employerScreen, setEmployerScreen] =
    useState<EmployerScreen>("dashboard");

  const [chatApplicationId, setChatApplicationId] = useState<number | null>(null);
  const [directMessageTargetUserId, setDirectMessageTargetUserId] = useState<number | null>(null);

  const [selectedEmployerJob, setSelectedEmployerJob] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const [acknowledgingCvNotice, setAcknowledgingCvNotice] = useState(false);
  const [cvNoticeError, setCvNoticeError] = useState<string | null>(null);

  function openChats(applicationId?: number | null) {
    setChatApplicationId(applicationId ?? null);

    if (user?.role === "EMPLOYER") {
      setEmployerScreen("chats");
      return;
    }

    if (user?.role === "GRADUATE") {
      setGraduateScreen("chats");
    }
  }

  function openDirectMessages(targetUserId?: number | null) {
    setDirectMessageTargetUserId(targetUserId ?? null);

    if (user?.role === "EMPLOYER") {
      setEmployerScreen("messages");
      return;
    }

    if (user?.role === "GRADUATE") {
      setGraduateScreen("messages");
    }
  }

  function openEmployerJobApplicants(jobId: number, jobTitle: string) {
    setSelectedEmployerJob({ id: jobId, title: jobTitle });
    setEmployerScreen("job_applicants");
  }

  async function acknowledgeCvVisibilityNotice() {
    if (!user || user.role !== "GRADUATE") return;

    setCvNoticeError(null);
    setAcknowledgingCvNotice(true);

    try {
      await api.post("/auth/acknowledge-cv-visibility/");
      setUser({
        ...user,
        has_seen_cv_visibility_notice: true,
      });
    } catch (err: any) {
      setCvNoticeError(
        err?.response?.data?.detail || "Failed to save your acknowledgement."
      );
    } finally {
      setAcknowledgingCvNotice(false);
    }
  }

  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>;

  if (!user) {
    if (authScreen === "home") {
      return (
        <HomePage
          onSelectRole={(role) => {
            setSelectedAuthRole(role);
            setAuthScreen("register");
          }}
          onGoToLogin={() => setAuthScreen("login")}
        />
      );
    }

    if (authScreen === "login") {
      return (
        <LoginPage
          initialEmail={verificationEmail}
          onGoToRegister={() => setAuthScreen("register")}
          onBackHome={() => setAuthScreen("home")}
          onGoToVerify={(email) => {
            setVerificationEmail(email || "");
            setAuthScreen("verify_email");
          }}
        />
      );
    }

    if (authScreen === "register") {
      return (
        <RegisterPage
          initialRole={selectedAuthRole}
          onGoToLogin={() => setAuthScreen("login")}
          onBackHome={() => setAuthScreen("home")}
          onRegistered={(email) => {
            setVerificationEmail(email);
            setAuthScreen("verify_email");
          }}
        />
      );
    }

    return (
      <VerifyEmailPage
        initialEmail={verificationEmail}
        onBackHome={() => setAuthScreen("home")}
        onGoToLogin={() => setAuthScreen("login")}
        onVerified={(email) => {
          setVerificationEmail(email);
          setAuthScreen("login");
        }}
      />
    );
  }

  const showCvNotice =
    user.role === "GRADUATE" && !user.has_seen_cv_visibility_notice;

  return (
    <div style={styles.page}>
      <CvVisibilityNoticeModal
        open={showCvNotice}
        loading={acknowledgingCvNotice}
        error={cvNoticeError}
        onConfirm={acknowledgeCvVisibilityNotice}
      />

      <div style={styles.topBar}>
        <div style={styles.brandWrap}>
          <div style={styles.brandMark}>
            <FiBriefcase size={20} />
          </div>
          <div style={styles.brandTextWrap}>
            <div style={styles.brandTitle}>Graduwayse</div>
            <div style={styles.brandSubtitle}>
              Graduate jobs, applications, and messaging
            </div>
          </div>
        </div>

        <div style={styles.topActions}>
          <div style={styles.userChip}>
            <FiUser size={16} />
            {user.email}
          </div>
          <button style={styles.buttonSecondary} onClick={logout}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FiLogOut size={16} />
              Logout
            </span>
          </button>
        </div>
      </div>

      {user.role === "GRADUATE" && (
        <div style={styles.navBar}>
          <NavBtn
            active={graduateScreen === "internal_jobs"}
            icon={<FiBriefcase size={16} />}
            label="Platform Jobs"
            onClick={() => setGraduateScreen("internal_jobs")}
          />
          <NavBtn
            active={graduateScreen === "adzuna_jobs"}
            icon={<FiSearch size={16} />}
            label="Adzuna Jobs"
            onClick={() => setGraduateScreen("adzuna_jobs")}
          />
          <NavBtn
            active={graduateScreen === "reed_jobs"}
            icon={<FiSearch size={16} />}
            label="Reed Jobs"
            onClick={() => setGraduateScreen("reed_jobs")}
          />
          <NavBtn
            active={graduateScreen === "applications"}
            icon={<FiGrid size={16} />}
            label="My Applications"
            onClick={() => setGraduateScreen("applications")}
          />
          <NavBtn
            active={graduateScreen === "profile"}
            icon={<FiUser size={16} />}
            label="My Profile"
            onClick={() => setGraduateScreen("profile")}
          />
          <NavBtn
            active={graduateScreen === "messages"}
            icon={<FiMail size={16} />}
            label="Direct Messages"
            onClick={() => openDirectMessages()}
          />
          <NavBtn
            active={graduateScreen === "chats"}
            icon={<FiMessageSquare size={16} />}
            label="Application Chats"
            onClick={() => openChats()}
          />
        </div>
      )}

      {user.role === "EMPLOYER" && (
        <div style={styles.navBar}>
          <NavBtn
            active={employerScreen === "dashboard"}
            icon={<FiGrid size={16} />}
            label="Manage Jobs"
            onClick={() => setEmployerScreen("dashboard")}
          />
          <NavBtn
            active={employerScreen === "students"}
            icon={<FiUsers size={16} />}
            label="Browse Students"
            onClick={() => setEmployerScreen("students")}
          />
          <NavBtn
            active={employerScreen === "messages"}
            icon={<FiMail size={16} />}
            label="Direct Messages"
            onClick={() => openDirectMessages()}
          />
          <NavBtn
            active={employerScreen === "chats"}
            icon={<FiMessageSquare size={16} />}
            label="Application Chats"
            onClick={() => openChats()}
          />
        </div>
      )}

      <div style={styles.container}>
        {user.role === "EMPLOYER" && (
          <>
            {employerScreen === "dashboard" && (
              <EmployerDashboard onViewApplicants={openEmployerJobApplicants} />
            )}

            {employerScreen === "students" && (
              <EmployerStudentsPage onOpenDirectMessages={openDirectMessages} />
            )}

            {employerScreen === "messages" && (
              <DirectMessagesPage
                role="EMPLOYER"
                initialTargetUserId={directMessageTargetUserId}
              />
            )}

            {employerScreen === "chats" && (
              <ChatsPage
                role="EMPLOYER"
                initialApplicationId={chatApplicationId}
              />
            )}

            {employerScreen === "job_applicants" && selectedEmployerJob && (
              <EmployerJobApplicantsPage
                jobId={selectedEmployerJob.id}
                jobTitle={selectedEmployerJob.title}
                onBack={() => setEmployerScreen("dashboard")}
                onOpenChats={openChats}
              />
            )}
          </>
        )}

        {user.role === "GRADUATE" && (
          <>
            {graduateScreen === "internal_jobs" && <InternalJobsPage />}
            {graduateScreen === "adzuna_jobs" && <AdzunaJobsPage />}
            {graduateScreen === "reed_jobs" && <ReedJobsPage />}
            {graduateScreen === "applications" && <MyApplications />}
            {graduateScreen === "profile" && <GraduateProfilePage />}
            {graduateScreen === "messages" && (
              <DirectMessagesPage
                role="GRADUATE"
                initialTargetUserId={directMessageTargetUserId}
              />
            )}
            {graduateScreen === "chats" && (
              <ChatsPage
                role="GRADUATE"
                initialApplicationId={chatApplicationId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}