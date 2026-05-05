import { useEffect, useMemo, useState } from "react";
import {
  getApplicantsForJob,
  updateApplicationStatus,
  type JobApplicant,
} from "../api/application";
import { styles } from "../ui/ui";
import { getErrorMessage } from "../utils/getErrorMessages";

type EmployerJobApplicantsPageProps = {
  jobId: number;
  jobTitle: string;
  onBack: () => void;
  onOpenChats: (applicationId?: number | null) => void;
};

type SortOption = "newest" | "oldest" | "name";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getStatusBadgeStyle(status: string) {
  const base = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700 as const,
  };

  if (status === "ACCEPTED") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "REJECTED") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "REVIEWED") {
    return { ...base, background: "#dbeafe", color: "#1d4ed8" };
  }

  return { ...base, background: "#f1f5f9", color: "#334155" };
}

export default function EmployerJobApplicantsPage({
  jobId,
  jobTitle,
  onBack,
  onOpenChats,
}: EmployerJobApplicantsPageProps) {
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({});

  async function loadApplicants() {
    setError(null);
    setLoading(true);

    try {
      const data = await getApplicantsForJob(jobId);
      setApplicants(data);

      const nextFeedbacks: Record<number, string> = {};
      data.forEach((a) => {
        nextFeedbacks[a.id] = a.feedback || "";
      });
      setFeedbackInputs(nextFeedbacks);

      if (data.length > 0) {
        setSelectedApplicantId(data[0].id);
      } else {
        setSelectedApplicantId(null);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load applicants"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  async function changeStatus(applicationId: number, status: string) {
    const feedback = (feedbackInputs[applicationId] || "").trim();

    if (status === "REJECTED" && !feedback) {
      alert("Feedback is required when rejecting an application.");
      return;
    }

    try {
      setError(null);

      const updated = await updateApplicationStatus(applicationId, status, feedback);

      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                status: updated.status,
                feedback: updated.feedback,
              }
            : a
        )
      );
    } catch (err: any) {
      alert(getErrorMessage(err, "Failed to update status"));
    }
  }

  function handleOpenChat(applicationId: number) {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, unread_messages: 0 } : a
      )
    );
    onOpenChats(applicationId);
  }

  const statusOptions = useMemo(() => {
    return Array.from(new Set(applicants.map((a) => a.status).filter(Boolean)));
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = applicants.filter((a) => {
      const fullName = (a.full_name || a.applicant.full_name || "").toLowerCase();
      const email = (a.applicant.email || "").toLowerCase();
      const location = (a.location || "").toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        location.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = (a.full_name || a.applicant.full_name || "").toLowerCase();
        const nameB = (b.full_name || b.applicant.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }

      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();

      if (sortBy === "oldest") return timeA - timeB;
      return timeB - timeA;
    });

    return result;
  }, [applicants, search, statusFilter, sortBy]);

  useEffect(() => {
    if (filteredApplicants.length === 0) {
      setSelectedApplicantId(null);
      return;
    }

    const exists = filteredApplicants.some((a) => a.id === selectedApplicantId);
    if (!exists) {
      setSelectedApplicantId(filteredApplicants[0].id);
    }
  }, [filteredApplicants, selectedApplicantId]);

  const selectedApplicant =
    filteredApplicants.find((a) => a.id === selectedApplicantId) || null;

  const stats = useMemo(() => {
    return applicants.reduce(
      (acc, applicant) => {
        acc.total += 1;
        acc[applicant.status] = (acc[applicant.status] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [applicants]);

  return (
    <div style={styles.container}>
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <button style={styles.buttonSecondary} onClick={onBack}>
              ← Back to jobs
            </button>

            <div style={{ ...styles.sectionTitle, marginTop: 12 }}>
              Applicants — {jobTitle}
            </div>

            <div style={{ color: "#64748b", marginTop: 6 }}>
              Review candidates, update status, open application chat, and view CVs.
            </div>
          </div>

          <button style={styles.buttonSecondary} onClick={loadApplicants}>
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={styles.card}>
          <div style={{ color: "#64748b", fontSize: 14 }}>Total</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.total || 0}</div>
        </div>

        <div style={styles.card}>
          <div style={{ color: "#64748b", fontSize: 14 }}>Reviewed</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.REVIEWED || 0}</div>
        </div>

        <div style={styles.card}>
          <div style={{ color: "#64748b", fontSize: 14 }}>Accepted</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.ACCEPTED || 0}</div>
        </div>

        <div style={styles.card}>
          <div style={{ color: "#64748b", fontSize: 14 }}>Rejected</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.REJECTED || 0}</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "1.6fr 1fr 1fr",
          }}
        >
          <input
            style={styles.input}
            placeholder="Search by name, email, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            style={styles.input}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: 12, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading applicants…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "380px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 700,
              }}
            >
              Applicant List
            </div>

            {filteredApplicants.length === 0 ? (
              <div style={{ padding: 16, color: "#64748b" }}>
                No applicants match these filters.
              </div>
            ) : (
              <div style={{ display: "grid" }}>
                {filteredApplicants.map((a) => {
                  const isActive = selectedApplicantId === a.id;
                  const name = a.full_name || a.applicant.full_name || "Unnamed applicant";

                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedApplicantId(a.id)}
                      style={{
                        textAlign: "left",
                        border: "none",
                        borderBottom: "1px solid #e5e7eb",
                        background: isActive ? "#eff6ff" : "#fff",
                        padding: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{name}</div>
                          <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
                            {a.applicant.email}
                          </div>
                        </div>

                        <span style={getStatusBadgeStyle(a.status)}>{a.status}</span>
                      </div>

                      <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
                        {a.location || "No location"} • Age: {a.age ?? "-"}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span>Applied: {formatDate(a.created_at)}</span>
                        <span>
                          {a.unread_messages > 0 ? `${a.unread_messages} unread` : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.card}>
            {!selectedApplicant ? (
              <div style={{ color: "#64748b" }}>
                Select an applicant to view details.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {selectedApplicant.full_name ||
                        selectedApplicant.applicant.full_name ||
                        "Unnamed applicant"}
                    </div>

                    <div style={{ color: "#64748b", marginTop: 6 }}>
                      {selectedApplicant.applicant.email}
                    </div>
                  </div>

                  <span style={getStatusBadgeStyle(selectedApplicant.status)}>
                    {selectedApplicant.status}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 13 }}>Age</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {selectedApplicant.age ?? "-"}
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 13 }}>Location</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {selectedApplicant.location || "-"}
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 13 }}>Applied</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {formatDate(selectedApplicant.created_at)}
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 13 }}>Unread chat messages</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {selectedApplicant.unread_messages || 0}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  {selectedApplicant.cv_url ? (
                    <a href={selectedApplicant.cv_url} target="_blank" rel="noreferrer">
                      <button style={styles.buttonSecondary}>Open CV</button>
                    </a>
                  ) : (
                    <div style={{ color: "#64748b" }}>No CV uploaded.</div>
                  )}
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Feedback</div>

                  <textarea
                    style={styles.input}
                    value={feedbackInputs[selectedApplicant.id] || ""}
                    onChange={(e) =>
                      setFeedbackInputs((prev) => ({
                        ...prev,
                        [selectedApplicant.id]: e.target.value,
                      }))
                    }
                    placeholder="Feedback (required for rejection)"
                    rows={5}
                  />
                </div>

                {selectedApplicant.feedback && (
                  <div
                    style={{
                      marginTop: 14,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Saved feedback</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{selectedApplicant.feedback}</div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => changeStatus(selectedApplicant.id, "REVIEWED")}
                  >
                    Review
                  </button>

                  <button
                    style={styles.buttonPrimary}
                    onClick={() => changeStatus(selectedApplicant.id, "ACCEPTED")}
                  >
                    Accept
                  </button>

                  <button
                    style={styles.buttonSecondary}
                    onClick={() => changeStatus(selectedApplicant.id, "REJECTED")}
                  >
                    Reject
                  </button>

                  <button
                    style={styles.buttonSecondary}
                    onClick={() => handleOpenChat(selectedApplicant.id)}
                  >
                    Open Chat
                    {selectedApplicant.unread_messages > 0
                      ? ` (${selectedApplicant.unread_messages})`
                      : ""}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}