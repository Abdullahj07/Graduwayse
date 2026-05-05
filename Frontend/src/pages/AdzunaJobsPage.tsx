import { useEffect, useState } from "react";
import { FiExternalLink, FiRefreshCw, FiSearch } from "react-icons/fi";
import {
  listInternalJobs,
  syncAdzunaJobs,
  type InternalJob,
} from "../api/internalJobs";
import { styles } from "../ui/ui";
import { getErrorMessage } from "../utils/getErrorMessages";

const categoryOptions = [
  { value: "ALL", label: "All Categories" },
  { value: "SOFTWARE", label: "Software" },
  { value: "DATA", label: "Data" },
  { value: "AI_ML", label: "AI / ML" },
  { value: "CYBER", label: "Cybersecurity" },
  { value: "CLOUD_DEVOPS", label: "Cloud / DevOps" },
  { value: "IT_SUPPORT", label: "IT Support" },
  { value: "PRODUCT", label: "Product" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Other" },
];

export default function AdzunaJobsPage() {
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 10;

  const [levelFilter, setLevelFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  async function load(
    pageNumber: number,
    level = levelFilter,
    category = categoryFilter
  ) {
    setError(null);
    setLoading(true);

    try {
      const data = await listInternalJobs({
        source: "ADZUNA",
        page: pageNumber,
        page_size: pageSize,
        level,
        category,
        ordering: "latest_adzuna",
      });

      setJobs(data.results);
      setCount(data.count);
      setPage(pageNumber);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load Adzuna jobs"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, levelFilter, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  async function handleSync() {
    setError(null);
    setSyncing(true);

    try {
      await syncAdzunaJobs();
      await load(1, levelFilter, categoryFilter);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to sync Adzuna jobs"));
    } finally {
      setSyncing(false);
    }
  }

  async function applyFilters(nextLevel: string, nextCategory: string) {
    setLevelFilter(nextLevel);
    setCategoryFilter(nextCategory);
    await load(1, nextLevel, nextCategory);
  }

  return (
    <div style={styles.section}>
      <div style={styles.pageHeader}>
        <div style={styles.pageTitleWrap}>
          <span style={styles.eyebrow}>External Opportunities</span>
          <h1 style={styles.pageTitle}>Adzuna Jobs</h1>
          <p style={styles.pageSubtitle}>
            Browse graduate and entry-level roles imported from Adzuna.
          </p>
        </div>

        <div style={styles.statChip}>
          <FiSearch size={16} />
          Page {page} of {totalPages} • {count} jobs
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Filters</h2>
            <p style={styles.cardSubtitle}>Refine the imported job listings.</p>
          </div>

          <button
            style={styles.buttonPrimary}
            onClick={handleSync}
            disabled={syncing}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FiRefreshCw size={16} />
              {syncing ? "Syncing Adzuna..." : "Sync Latest Adzuna Jobs"}
            </span>
          </button>
        </div>

        <div style={styles.grid2}>
          <select
            style={styles.input}
            value={levelFilter}
            onChange={(e) => applyFilters(e.target.value, categoryFilter)}
          >
            <option value="ALL">All Levels</option>
            <option value="GRADUATE">Graduate</option>
            <option value="ENTRY">Entry</option>
            <option value="INTERNSHIP">Internship</option>
          </select>

          <select
            style={styles.input}
            value={categoryFilter}
            onChange={(e) => applyFilters(levelFilter, e.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyState}>Loading Adzuna jobs...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.emptyState}>No jobs found for these filters.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {jobs.map((job) => (
            <div key={job.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a" }}>
                    {job.title}
                  </div>

                  <div style={{ color: "#475569", marginTop: 6, fontWeight: 600 }}>
                    {job.company_name} • {job.location || "Location not provided"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <span style={styles.pill}>{job.level}</span>
                    <span style={styles.pill}>{job.category || "OTHER"}</span>
                    <span style={styles.pill}>
                      Posted{" "}
                      {job.external_created_at
                        ? new Date(job.external_created_at).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                {job.external_url ? (
                  <a href={job.external_url} target="_blank" rel="noreferrer">
                    <button style={styles.buttonPrimary}>
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        <FiExternalLink size={16} />
                        Apply Externally
                      </span>
                    </button>
                  </a>
                ) : (
                  <button style={styles.buttonSecondary} disabled>
                    No Link
                  </button>
                )}
              </div>

              <p
                style={{
                  marginTop: 14,
                  marginBottom: 0,
                  color: "#334155",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {job.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
          flexWrap: "wrap",
        }}
      >
        <button
          style={styles.buttonSecondary}
          onClick={() => load(page - 1, levelFilter, categoryFilter)}
          disabled={page <= 1 || loading}
        >
          Previous
        </button>

        <div style={styles.statChip}>
          Page {page} / {totalPages}
        </div>

        <button
          style={styles.buttonSecondary}
          onClick={() => load(page + 1, levelFilter, categoryFilter)}
          disabled={page >= totalPages || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}