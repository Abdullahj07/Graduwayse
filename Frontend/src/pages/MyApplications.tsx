import { useEffect, useState } from "react";
import { getMyApplications, type MyApplication } from "../api/application";
import { styles } from "../ui/ui";

function StatusBadge({ status }: { status: string }) {
  let background = "#eee";
  let color = "#333";
  let label = status;

  if (status === "APPLIED") {
    background = "#fff3cd";
    color = "#856404";
    label = "Applied";
  }

  if (status === "REVIEWED") {
    background = "#cce5ff";
    color = "#004085";
    label = "Reviewed";
  }

  if (status === "ACCEPTED") {
    background = "#d4edda";
    color = "#155724";
    label = "Accepted";
  }

  if (status === "REJECTED") {
    background = "#f8d7da";
    color = "#721c24";
    label = "Rejected";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        background,
        color,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {label}
    </span>
  );
}

export default function MyApplications() {
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyApplications();
        setApps(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={{ marginTop: 0 }}>My Applications</h2>

      {loading ? (
        <div>Loading...</div>
      ) : apps.length === 0 ? (
        <div>You haven't applied to any jobs yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {apps.map((a) => (
            <div key={a.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{a.job_title}</div>
                  <div style={{ color: "#666", marginTop: 6 }}>
                    Applied: {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>

                <StatusBadge status={a.status} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div>
                  <b>Name:</b> {a.full_name}
                </div>
                <div>
                  <b>Age:</b> {a.age ?? "-"}
                </div>
                <div>
                  <b>Location:</b> {a.location || "-"}
                </div>
                <div>
                  <b>CV:</b>{" "}
                  {a.cv_url ? (
                    <a href={a.cv_url} target="_blank" rel="noreferrer">
                      Open CV
                    </a>
                  ) : (
                    "No CV uploaded"
                  )}
                </div>
              </div>

              {a.feedback && (
                <div style={{ marginTop: 12, color: "#444" }}>
                  <b>Employer feedback:</b> {a.feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

