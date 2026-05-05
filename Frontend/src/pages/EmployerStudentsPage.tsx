import { useEffect, useState } from "react";
import { api } from "../api/client";

type GraduateProfile = {
  id: number;
  full_name: string;
  email: string;
  education_level: string;
  university: string;
  degree: string;
  grade: string;
  years_of_experience: number | null;
  age: number | null;
  location: string;
  skills: string;
  bio: string;
  cv_url: string | null;
  updated_at: string | null;
};

type Filters = {
  search: string;
  education_level: string;
  grade: string;
  location: string;
  min_years_of_experience: string;
  min_age: string;
  max_age: string;
};

const initialFilters: Filters = {
  search: "",
  education_level: "",
  grade: "",
  location: "",
  min_years_of_experience: "",
  min_age: "",
  max_age: "",
};

export default function EmployerStudentsPage({
  onOpenDirectMessages,
}: {
  onOpenDirectMessages: (targetUserId?: number | null) => void;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [students, setStudents] = useState<GraduateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function getInitials(name: string) {
    const cleaned = name.trim();
    if (!cleaned) return "?";

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function getSkills(skills: string) {
    return skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  async function loadStudents() {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) params[key] = value.trim();
      });

      const res = await api.get<GraduateProfile[]>("/auth/graduates/", { params });
      setStudents(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Browse Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search and filter graduate profiles.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Search name, university, degree, skills..."
          />

          <select
            value={filters.education_level}
            onChange={(e) => updateFilter("education_level", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All education levels</option>
            <option value="BACHELORS">Bachelor&apos;s</option>
            <option value="MASTERS">Master&apos;s</option>
            <option value="PHD">PhD</option>
            <option value="OTHER">Other</option>
          </select>

          <input
            value={filters.grade}
            onChange={(e) => updateFilter("grade", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Grade"
          />

          <input
            value={filters.location}
            onChange={(e) => updateFilter("location", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Location"
          />

          <input
            type="number"
            min="0"
            value={filters.min_years_of_experience}
            onChange={(e) => updateFilter("min_years_of_experience", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Min years of experience"
          />

          <input
            type="number"
            min="0"
            value={filters.min_age}
            onChange={(e) => updateFilter("min_age", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Min age"
          />

          <input
            type="number"
            min="0"
            value={filters.max_age}
            onChange={(e) => updateFilter("max_age", e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Max age"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadStudents}
              className="flex-1 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setTimeout(() => loadStudents(), 0);
              }}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
          No students found.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {getInitials(student.full_name || student.email)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold text-slate-900">
                    {student.full_name || "Unnamed Graduate"}
                  </div>
                  <div className="truncate text-sm text-slate-500">{student.email}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-800">Education:</span>{" "}
                  {student.education_level || "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-800">University:</span>{" "}
                  {student.university || "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-800">Degree:</span>{" "}
                  {student.degree || "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-800">Grade:</span>{" "}
                  {student.grade || "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-800">Experience:</span>{" "}
                  {student.years_of_experience ?? "-"} year(s)
                </div>
                <div>
                  <span className="font-medium text-slate-800">Age:</span>{" "}
                  {student.age ?? "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-800">Location:</span>{" "}
                  {student.location || "-"}
                </div>
              </div>

              {student.bio && (
                <div className="mt-4 text-sm leading-6 text-slate-600">
                  {student.bio}
                </div>
              )}

              {getSkills(student.skills).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {getSkills(student.skills).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Updated{" "}
                  {student.updated_at
                    ? new Date(student.updated_at).toLocaleDateString()
                    : "-"}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDirectMessages(student.id)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Message
                  </button>

                  {student.cv_url ? (
                    <a
                      href={student.cv_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Open CV
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No CV uploaded</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}