import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { applyForJob } from "../api/application";
import { listInternalJobs, type InternalJob } from "../api/internalJobs";

type Application = {
  id: number;
  job: number;
  status: string;
  created_at: string;
};

type ApplyFormState = {
  full_name: string;
  age: string;
  location: string;
  cv: File | null;
};

const emptyApplyForm: ApplyFormState = {
  full_name: "",
  age: "",
  location: "",
  cv: null,
};

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 45%, #e2e8f0 100%)",
    padding: "24px 20px 40px",
    color: "#0f172a",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#2563eb",
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "#475569",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 40,
    padding: "0 14px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    fontWeight: 700,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "420px minmax(0, 1fr)",
    gap: 20,
    alignItems: "start",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  stickyWrap: {
    position: "sticky",
    top: 18,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  },
  filterCard: {
    padding: 16,
  },
  filterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  filterTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  resetButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    fontSize: 13,
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "0 14px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "0 14px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
  },
  listCard: {
    padding: 10,
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px 14px",
  },
  listTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  listMeta: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
  },
  jobList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    paddingRight: 4,
  },
  jobCard: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 16,
    cursor: "pointer",
    transition: "all 0.18s ease",
    background: "#ffffff",
  },
  selectedJobCard: {
    border: "1px solid #2563eb",
    background: "#eff6ff",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.12)",
  },
  previewCard: {
    padding: 0,
    overflow: "hidden",
    minHeight: 760,
  },
  previewHeader: {
    padding: "22px 24px 18px",
    borderBottom: "1px solid #e2e8f0",
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(255,255,255,1) 100%)",
  },
  previewBody: {
    padding: "22px 24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  previewTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
  },
  companyLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    color: "#334155",
    fontSize: 15,
    fontWeight: 600,
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    color: "#334155",
    fontWeight: 700,
  },
  primaryButton: {
    height: 46,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.18)",
  },
  secondaryButton: {
    height: 46,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
  },
  paragraph: {
    margin: 0,
    color: "#334155",
    fontSize: 14.5,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  divider: {
    height: 1,
    background: "#e2e8f0",
    width: "100%",
  },
  applyBox: {
    marginTop: 4,
    padding: 18,
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  applyGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fileInput: {
    width: "100%",
    borderRadius: 12,
    border: "1px dashed #93c5fd",
    background: "#ffffff",
    padding: "12px 14px",
    fontSize: 14,
    color: "#334155",
    boxSizing: "border-box",
  },
  messageBox: {
    padding: "12px 14px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
  },
  emptyState: {
    padding: 26,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
  },
};

function splitLines(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\n|•/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPostedDate(job: InternalJob) {
  const raw = (job as any).created_at || (job as any).posted_at;
  if (!raw) return "Recently posted";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Recently posted";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InternalJobsPage() {
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState("");

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<number | null>(null);

  const [openApplyJobId, setOpenApplyJobId] = useState<number | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyForm, setApplyForm] = useState<ApplyFormState>(emptyApplyForm);

  async function load() {
    setError(null);
    setLoading(true);

    try {
      const jobsRes = await listInternalJobs({
        source: "MANUAL",
        page: 1,
        page_size: 100,
      });

      setJobs(jobsRes.results);
      setSelectedJobId(jobsRes.results[0]?.id ?? null);

      const appsRes = await api.get<Application[]>("/applications/mine/");
      setAppliedJobIds(new Set(appsRes.data.map((a) => a.job)));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load jobs/applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openApplyForm(jobId: number) {
    setError(null);
    setSelectedJobId(jobId);
    setOpenApplyJobId(jobId);
    setApplyForm(emptyApplyForm);
  }

  function closeApplyForm() {
    setOpenApplyJobId(null);
    setApplyForm(emptyApplyForm);
    setApplyLoading(false);
  }

  async function submitApplication(jobId: number) {
    setError(null);

    if (!applyForm.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!applyForm.age.trim()) {
      setError("Age is required.");
      return;
    }

    const numericAge = Number(applyForm.age);
    if (!Number.isFinite(numericAge) || numericAge <= 0) {
      setError("Age must be a valid number greater than 0.");
      return;
    }

    if (!applyForm.location.trim()) {
      setError("Location is required.");
      return;
    }

    if (!applyForm.cv) {
      setError("CV file is required.");
      return;
    }

    setApplyLoading(true);

    try {
      await applyForJob({
        job: jobId,
        full_name: applyForm.full_name.trim(),
        age: numericAge,
        location: applyForm.location.trim(),
        cv: applyForm.cv,
      });

      setAppliedJobIds((prev) => new Set([...prev, jobId]));
      closeApplyForm();
    } catch (err: any) {
      const data = err?.response?.data;

      if (data?.detail) {
        setError(data.detail);
      } else if (typeof data === "string") {
        setError(data);
      } else {
        setError("Apply failed. You may have already applied for this job.");
      }
    } finally {
      setApplyLoading(false);
    }
  }

  const filteredJobs = useMemo(() => {
    const s = search.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();

    return jobs.filter((j) => {
      const matchesSearch =
        !s ||
        j.title.toLowerCase().includes(s) ||
        j.company_name.toLowerCase().includes(s) ||
        (j.description ?? "").toLowerCase().includes(s);

      const matchesLevel = levelFilter === "ALL" || j.level === levelFilter;
      const matchesLocation = !loc || (j.location ?? "").toLowerCase().includes(loc);

      return matchesSearch && matchesLevel && matchesLocation;
    });
  }, [jobs, search, levelFilter, locationFilter]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }

    const exists = filteredJobs.some((job) => job.id === selectedJobId);
    if (!exists) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) || filteredJobs[0] || null;

  const selectedJobApplied = selectedJob ? appliedJobIds.has(selectedJob.id) : false;
  const selectedJobFormOpen = selectedJob ? openApplyJobId === selectedJob.id : false;

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.container}>
        <div style={pageStyles.topBar}>
          <div style={pageStyles.titleWrap}>
            <span style={pageStyles.eyebrow}>Internal Opportunities</span>
            <h1 style={pageStyles.title}>Find graduate roles that fit you</h1>
            <p style={pageStyles.subtitle}>
              Browse recent platform jobs created by employers.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              style={{
                ...pageStyles.secondaryButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onClick={load}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Listings"}
            </button>

            <div style={pageStyles.badge}>
              <span>{filteredJobs.length}</span>
              <span style={pageStyles.muted}>jobs available</span>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              ...pageStyles.messageBox,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            ...pageStyles.layout,
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth < 1080
                ? "1fr"
                : "420px minmax(0, 1fr)",
          }}
        >
          <div style={pageStyles.leftColumn}>
            <div style={pageStyles.stickyWrap}>
              <div style={{ ...pageStyles.card, ...pageStyles.filterCard }}>
                <div style={pageStyles.filterHeader}>
                  <h2 style={pageStyles.filterTitle}>Filters</h2>
                  <button
                    style={pageStyles.resetButton}
                    onClick={() => {
                      setSearch("");
                      setLevelFilter("ALL");
                      setLocationFilter("");
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div style={pageStyles.filterGrid}>
                  <div>
                    <label style={pageStyles.label}>Search</label>
                    <input
                      style={pageStyles.input}
                      placeholder="Search jobs, company, description..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={pageStyles.label}>Level</label>
                    <select
                      style={pageStyles.select}
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">All levels</option>
                      <option value="GRADUATE">Graduate</option>
                      <option value="ENTRY">Entry</option>
                      <option value="INTERNSHIP">Internship</option>
                    </select>
                  </div>

                  <div>
                    <label style={pageStyles.label}>Location</label>
                    <input
                      style={pageStyles.input}
                      placeholder="Location"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ ...pageStyles.card, ...pageStyles.listCard }}>
                <div style={pageStyles.listHeader}>
                  <h2 style={pageStyles.listTitle}>Job results</h2>
                  <span style={pageStyles.listMeta}>
                    {loading ? "Loading..." : `${filteredJobs.length} matches`}
                  </span>
                </div>

                {loading ? (
                  <div style={pageStyles.emptyState}>Loading platform jobs...</div>
                ) : !filteredJobs.length ? (
                  <div style={pageStyles.emptyState}>
                    No platform jobs match your filters.
                  </div>
                ) : (
                  <div style={pageStyles.jobList}>
                    {filteredJobs.map((job) => {
                      const applied = appliedJobIds.has(job.id);
                      const isSelected = selectedJob?.id === job.id;
                      const isHovered = hoveredJobId === job.id;

                      return (
                        <div
                          key={job.id}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setError(null);
                          }}
                          onMouseEnter={() => setHoveredJobId(job.id)}
                          onMouseLeave={() => setHoveredJobId(null)}
                          style={{
                            ...pageStyles.jobCard,
                            ...(isSelected ? pageStyles.selectedJobCard : {}),
                            transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                            boxShadow: isHovered
                              ? "0 12px 24px rgba(15, 23, 42, 0.08)"
                              : isSelected
                              ? "0 8px 20px rgba(37, 99, 235, 0.12)"
                              : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 12,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 17,
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  lineHeight: 1.3,
                                }}
                              >
                                {job.title}
                              </h3>

                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  fontSize: 13.5,
                                  color: "#475569",
                                  fontWeight: 600,
                                }}
                              >
                                <span>{job.company_name}</span>
                                <span>•</span>
                                <span>{job.location || "Location not provided"}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 999,
                                  background: "#2563eb",
                                  marginTop: 6,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 12,
                            }}
                          >
                            <span style={pageStyles.tag}>{job.level}</span>
                            {applied && <span style={pageStyles.tag}>Applied</span>}
                          </div>

                          <p
                            style={{
                              margin: "12px 0 0",
                              fontSize: 14,
                              color: "#475569",
                              lineHeight: 1.6,
                            }}
                          >
                            {(job.description || "No description available.").slice(0, 180)}
                            {(job.description || "").length > 180 ? "..." : ""}
                          </p>

                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 12.5,
                              color: "#64748b",
                              fontWeight: 700,
                            }}
                          >
                            Posted {getPostedDate(job)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...pageStyles.card, ...pageStyles.previewCard }}>
            {!selectedJob ? (
              <div style={pageStyles.emptyState}>Select a job to see the full preview.</div>
            ) : (
              <>
                <div style={pageStyles.previewHeader}>
                  <h2 style={pageStyles.previewTitle}>{selectedJob.title}</h2>

                  <div style={pageStyles.companyLine}>
                    <span>{selectedJob.company_name}</span>
                    <span>•</span>
                    <span>{selectedJob.location || "Location not provided"}</span>
                  </div>

                  <div style={pageStyles.tagRow}>
                    <span style={pageStyles.tag}>{selectedJob.level}</span>
                    <span style={pageStyles.tag}>Posted {getPostedDate(selectedJob)}</span>
                    {selectedJobApplied && <span style={pageStyles.tag}>Already applied</span>}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      style={
                        selectedJobApplied
                          ? pageStyles.secondaryButton
                          : pageStyles.primaryButton
                      }
                      onClick={() => {
                        if (!selectedJobApplied) openApplyForm(selectedJob.id);
                      }}
                      disabled={selectedJobApplied}
                    >
                      {selectedJobApplied ? "Applied" : "Apply now"}
                    </button>

                    {selectedJobFormOpen && !selectedJobApplied && (
                      <button
                        style={pageStyles.secondaryButton}
                        onClick={closeApplyForm}
                        disabled={applyLoading}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div style={pageStyles.previewBody}>
                  <div style={pageStyles.section}>
                    <h3 style={pageStyles.sectionTitle}>Job description</h3>
                    <p style={pageStyles.paragraph}>
                      {selectedJob.description || "No description provided."}
                    </p>
                  </div>

                  {splitLines(selectedJob.description).length > 1 && (
                    <>
                      <div style={pageStyles.divider} />
                      <div style={pageStyles.section}>
                        <h3 style={pageStyles.sectionTitle}>Role highlights</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {splitLines(selectedJob.description)
                            .slice(0, 6)
                            .map((item, index) => (
                              <div
                                key={`${item}-${index}`}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 10,
                                  color: "#334155",
                                  fontSize: 14.5,
                                  lineHeight: 1.7,
                                }}
                              >
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 999,
                                    background: "#2563eb",
                                    marginTop: 9,
                                    flexShrink: 0,
                                  }}
                                />
                                <span>{item}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedJobFormOpen && !selectedJobApplied && (
                    <>
                      <div style={pageStyles.divider} />

                      <div style={pageStyles.applyBox}>
                        <div>
                          <h3
                            style={{
                              ...pageStyles.sectionTitle,
                              fontSize: 18,
                              marginBottom: 4,
                            }}
                          >
                            Apply for {selectedJob.title}
                          </h3>
                          <p style={{ ...pageStyles.paragraph, fontSize: 14 }}>
                            Submit your details and CV directly from this page.
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={pageStyles.applyGrid}>
                            <div>
                              <label style={pageStyles.label}>Full name</label>
                              <input
                                style={pageStyles.input}
                                type="text"
                                placeholder="Full name"
                                value={applyForm.full_name}
                                onChange={(e) =>
                                  setApplyForm((prev) => ({
                                    ...prev,
                                    full_name: e.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div>
                              <label style={pageStyles.label}>Age</label>
                              <input
                                style={pageStyles.input}
                                type="number"
                                min="1"
                                placeholder="Age"
                                value={applyForm.age}
                                onChange={(e) =>
                                  setApplyForm((prev) => ({
                                    ...prev,
                                    age: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label style={pageStyles.label}>Location</label>
                            <input
                              style={pageStyles.input}
                              type="text"
                              placeholder="Location"
                              value={applyForm.location}
                              onChange={(e) =>
                                setApplyForm((prev) => ({
                                  ...prev,
                                  location: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <label style={pageStyles.label}>CV upload</label>
                            <input
                              style={pageStyles.fileInput}
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) =>
                                setApplyForm((prev) => ({
                                  ...prev,
                                  cv:
                                    e.target.files && e.target.files.length > 0
                                      ? e.target.files[0]
                                      : null,
                                }))
                              }
                            />
                            {applyForm.cv && (
                              <div style={{ ...pageStyles.muted, marginTop: 6 }}>
                                {applyForm.cv.name}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                            <button
                              style={{
                                ...pageStyles.primaryButton,
                                opacity: applyLoading ? 0.7 : 1,
                                cursor: applyLoading ? "not-allowed" : "pointer",
                              }}
                              onClick={() => submitApplication(selectedJob.id)}
                              disabled={applyLoading}
                            >
                              {applyLoading ? "Submitting..." : "Submit Application"}
                            </button>

                            <button
                              style={pageStyles.secondaryButton}
                              onClick={closeApplyForm}
                              disabled={applyLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}