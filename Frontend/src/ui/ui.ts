import type { CSSProperties } from "react";

export const colors = {
  bg: "#edf4ff",
  bgSoft: "#dfeeff",
  surface: "#f8fbff",
  surfaceAlt: "#eef6ff",
  border: "#d7e3f4",
  borderStrong: "#bfd0e6",
  text: "#0f172a",
  textSoft: "#334155",
  textMuted: "#64748b",
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primarySoft: "#dbeafe",
  accent: "#0f766e",
  accentSoft: "#ccfbf1",
  success: "#16a34a",
  successSoft: "#dcfce7",
  warning: "#d97706",
  warningSoft: "#fef3c7",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
};

export const shadows = {
  sm: "0 4px 10px rgba(15, 23, 42, 0.04)",
  md: "0 10px 24px rgba(15, 23, 42, 0.08)",
  lg: "0 20px 40px rgba(15, 23, 42, 0.12)",
};

export const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #edf4ff 0%, #e0ecff 42%, #dbeafe 100%)",
    color: colors.text,
  },

  container: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 24,
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  },

  pageTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: colors.accent,
  },

  pageTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: colors.text,
  },

  pageSubtitle: {
    margin: 0,
    fontSize: 14,
    color: colors.textSoft,
  },

  topBar: {
    borderBottom: `1px solid ${colors.border}`,
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(90deg, #eff6ff 0%, #dfeeff 100%)",
    backdropFilter: "blur(14px)",
    position: "sticky",
    top: 0,
    zIndex: 40,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
  },

  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
    color: "#fff",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.18)",
  },

  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  brandTitle: {
    fontWeight: 800,
    fontSize: 20,
    color: colors.text,
    lineHeight: 1.1,
  },

  brandSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: 600,
  },

  topActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  userChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.8)",
    border: `1px solid ${colors.border}`,
    color: colors.textSoft,
    fontWeight: 700,
    boxShadow: shadows.sm,
    fontSize: 13,
  },

  navBar: {
    display: "flex",
    gap: 10,
    padding: "14px 24px",
    borderBottom: `1px solid ${colors.border}`,
    background: "rgba(238,246,255,0.82)",
    flexWrap: "wrap",
  },

  navButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "rgba(255,255,255,0.82)",
    color: colors.text,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: shadows.sm,
  },

  navButtonActive: {
    height: 42,
    padding: "0 16px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.18)",
  },

  card: {
    background: "rgba(248,251,255,0.92)",
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: 18,
    boxShadow: shadows.md,
    backdropFilter: "blur(8px)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  cardTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: colors.text,
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: colors.textMuted,
    fontSize: 14,
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr",
    gap: 12,
  },

  input: {
    width: "100%",
    height: 44,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 12,
    padding: "0 14px",
    fontSize: 14,
    background: "rgba(255,255,255,0.9)",
    color: colors.text,
    boxSizing: "border-box",
    outline: "none",
  },

  textarea: {
    width: "100%",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    background: "rgba(255,255,255,0.9)",
    color: colors.text,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
  },

  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.02em",
    color: colors.textSoft,
    marginBottom: 6,
  },

  buttonPrimary: {
    height: 44,
    padding: "0 16px",
    background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.18)",
  },

  buttonSecondary: {
    height: 44,
    padding: "0 16px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 12,
    background: "rgba(255,255,255,0.88)",
    color: colors.text,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },

  buttonDanger: {
    height: 44,
    padding: "0 16px",
    border: "none",
    borderRadius: 12,
    background: colors.danger,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
  },

  statChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.82)",
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.sm,
    color: colors.text,
    fontWeight: 700,
    fontSize: 13,
  },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    color: colors.textSoft,
    fontWeight: 700,
    fontSize: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 12,
    color: colors.text,
  },

  emptyState: {
    padding: 28,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
    background: "rgba(255,255,255,0.55)",
    borderRadius: 16,
    border: `1px dashed ${colors.border}`,
  },

  errorBox: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: colors.dangerSoft,
    color: "#991b1b",
    border: "1px solid #fecaca",
    fontWeight: 600,
  },

  successBox: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: colors.successSoft,
    color: "#166534",
    border: "1px solid #bbf7d0",
    fontWeight: 600,
  },
};

export function getStatusBadgeStyle(status: string): CSSProperties {
  const upper = status.toUpperCase();

  if (upper === "APPLIED" || upper === "SUBMITTED") {
    return {
      background: colors.warningSoft,
      color: colors.warning,
      border: "1px solid #fcd34d",
    };
  }

  if (upper === "REVIEWED" || upper === "UNDER REVIEW" || upper === "INTERVIEW") {
    return {
      background: colors.primarySoft,
      color: colors.primary,
      border: "1px solid #93c5fd",
    };
  }

  if (upper === "ACCEPTED") {
    return {
      background: colors.successSoft,
      color: colors.success,
      border: "1px solid #86efac",
    };
  }

  if (upper === "REJECTED") {
    return {
      background: colors.dangerSoft,
      color: colors.danger,
      border: "1px solid #fca5a5",
    };
  }

  return {
    background: colors.surfaceAlt,
    color: colors.textSoft,
    border: `1px solid ${colors.border}`,
  };
}