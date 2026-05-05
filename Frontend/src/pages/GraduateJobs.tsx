import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { applyForJob } from "../api/application";

type InternalJob = {
  id: number;
  title: string;
  company_name: string;
  location: string;
  description: string;
  level: string;
  source?: "MANUAL" | "ADZUNA";
  external_url?: string;
  can_apply_in_app?: boolean;
};

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

export default function GraduateJobs() {
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState("");

  const [openApplyJobId, setOpenApplyJobId] = useState<number | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyForm, setApplyForm] = useState<ApplyFormState>(emptyApplyForm);

  async function load() {
    setError(null);
    setLoading(true);

    try {
      const jobsRes = await api.get<InternalJob[]>("/internal-jobs/");
      setJobs(jobsRes.data);

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
      setError(typeof data === "object" ? JSON.stringify(data) : "Apply failed");
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

  if (loading) {
    return <div style={{ padding: 16 }}>Loading jobs…</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>Jobs</h2>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={load} style={{ padding: "8px 12px" }}>
          Refresh
        </button>

        <div>
          Showing <b>{filteredJobs.length}</b> of <b>{jobs.length}</b>
        </div>
      </div>

      {error && (
        <div style={{ color: "crimson", marginTop: 10, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          placeholder="Search title/company/description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 10 }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ padding: 10 }}
          >
            <option value="ALL">All levels</option>
            <option value="GRADUATE">GRADUATE</option>
            <option value="ENTRY">ENTRY</option>
            <option value="INTERNSHIP">INTERNSHIP</option>
          </select>

          <input
            placeholder="Filter by location…"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ padding: 10, flex: 1, minWidth: 220 }}
          />

          <button
            onClick={() => {
              setSearch("");
              setLevelFilter("ALL");
              setLocationFilter("");
            }}
            style={{ padding: "10px 12px" }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
        {filteredJobs.map((job) => {
          const applied = appliedJobIds.has(job.id);
          const formOpen = openApplyJobId === job.id;
          const isManualJob = (job.source ?? "MANUAL") === "MANUAL";
          const canApplyInApp = job.can_apply_in_app ?? isManualJob;

          return (
            <div
              key={job.id}
              style={{ border: "1px solid #ddd", padding: 14, borderRadius: 8 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{job.title}</div>
                  <div>
                    <b>{job.company_name}</b> — {job.location} — <b>{job.level}</b>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
                    Source: {isManualJob ? "Platform Job" : "Adzuna"}
                  </div>
                </div>

                {canApplyInApp ? (
                  <button
                    onClick={() => openApplyForm(job.id)}
                    disabled={applied}
                    style={{ padding: "8px 12px", height: 40 }}
                  >
                    {applied ? "Applied ✅" : "Apply"}
                  </button>
                ) : job.external_url ? (
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 12px",
                      height: 40,
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "#111",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Apply Externally
                  </a>
                ) : (
                  <button disabled style={{ padding: "8px 12px", height: 40 }}>
                    No Apply Link
                  </button>
                )}
              </div>

              <p style={{ marginTop: 10 }}>{job.description}</p>

              {formOpen && canApplyInApp && !applied && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    background: "#fafafa",
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Apply for {job.title}</h3>

                  <div style={{ display: "grid", gap: 10 }}>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={applyForm.full_name}
                      onChange={(e) =>
                        setApplyForm((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      style={{ padding: 10 }}
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Age"
                      value={applyForm.age}
                      onChange={(e) =>
                        setApplyForm((prev) => ({ ...prev, age: e.target.value }))
                      }
                      style={{ padding: 10 }}
                    />

                    <input
                      type="text"
                      placeholder="Location"
                      value={applyForm.location}
                      onChange={(e) =>
                        setApplyForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      style={{ padding: 10 }}
                    />

                    <div>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                        Upload CV
                      </label>
                      <input
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
                        <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                          Selected: {applyForm.cv.name}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button
                        onClick={() => submitApplication(job.id)}
                        disabled={applyLoading}
                        style={{ padding: "10px 14px" }}
                      >
                        {applyLoading ? "Submitting..." : "Submit Application"}
                      </button>

                      <button
                        onClick={closeApplyForm}
                        disabled={applyLoading}
                        style={{ padding: "10px 14px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredJobs.length === 0 && <div>No jobs match your filters.</div>}
      </div>
    </div>
  );
}