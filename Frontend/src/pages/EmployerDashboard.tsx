import { useEffect, useMemo, useState } from "react";
import { FiBriefcase, FiPlusCircle, FiSearch, FiUsers } from "react-icons/fi";
import {
  createInternalJob,
  listMyInternalJobs,
  type InternalJob,
} from "../api/internalJobs";
import { styles } from "../ui/ui";
import { getErrorMessage } from "../utils/getErrorMessages";

type EmployerDashboardProps = {
  onViewApplicants: (jobId: number, jobTitle: string) => void;
};

export default function EmployerDashboard({
  onViewApplicants,
}: EmployerDashboardProps) {
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState("");

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("GRADUATE");

  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setError(null);
    setLoadingJobs(true);

    try {
      const data = await listMyInternalJobs();
      setJobs(data);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load jobs"));
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await createInternalJob({
        title,
        company_name: companyName,
        location,
        description,
        level,
      });

      setTitle("");
      setCompanyName("");
      setLocation("");
      setDescription("");
      setLevel("GRADUATE");

      await loadJobs();
    } catch (err: any) {
      setError(getErrorMessage(err, "Create job failed"));
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

  return (
    <div style={styles.section}>
      <div style={styles.pageHeader}>
        <div style={styles.pageTitleWrap}>
          <span style={styles.eyebrow}>Employer Workspace</span>
          <h1 style={styles.pageTitle}>Manage your jobs</h1>
          <p style={styles.pageSubtitle}>
            Create vacancies, review your job list, and open applicant views.
          </p>
        </div>

        <div style={styles.statChip}>
          <FiBriefcase size={16} />
          {jobs.length} posted jobs
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Create Job</h2>
            <p style={styles.cardSubtitle}>
              Add a new graduate, entry-level, or internship opportunity.
            </p>
          </div>
        </div>

        <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Job title</label>
              <input
                style={styles.input}
                placeholder="Graduate Software Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={styles.label}>Company name</label>
              <input
                style={styles.input}
                placeholder="Your company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Location</label>
              <input
                style={styles.input}
                placeholder="London, Remote..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>Level</label>
              <select
                style={styles.input}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="GRADUATE">Graduate</option>
                <option value="ENTRY">Entry</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              placeholder="Describe the role, responsibilities, and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
            />
          </div>

          <div>
            <button style={styles.buttonPrimary}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FiPlusCircle size={16} />
                Create Job
              </span>
            </button>
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>My Jobs</h2>
            <p style={styles.cardSubtitle}>
              Search and filter the jobs you have created.
            </p>
          </div>

          <div style={styles.statChip}>
            <FiSearch size={16} />
            {filteredJobs.length} matching jobs
          </div>
        </div>

        <div style={styles.grid3}>
          <input
            style={styles.input}
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={styles.input}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">All levels</option>
            <option value="GRADUATE">Graduate</option>
            <option value="ENTRY">Entry</option>
            <option value="INTERNSHIP">Internship</option>
          </select>

          <input
            style={styles.input}
            placeholder="Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
      </div>

      {loadingJobs ? (
        <div style={styles.emptyState}>Loading your jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div style={styles.emptyState}>No jobs found.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredJobs.map((j) => (
            <div key={j.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{j.title}</div>
                  <div style={{ color: "#475569", marginTop: 6, fontWeight: 600 }}>
                    {j.company_name} • {j.location || "Location not provided"} • {j.level}
                  </div>
                </div>

                <button
                  style={styles.buttonPrimary}
                  onClick={() => onViewApplicants(j.id, j.title)}
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <FiUsers size={16} />
                    View Applicants
                  </span>
                </button>
              </div>

              <p
                style={{
                  marginTop: 14,
                  marginBottom: 0,
                  whiteSpace: "pre-wrap",
                  color: "#334155",
                  lineHeight: 1.7,
                }}
              >
                {j.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}