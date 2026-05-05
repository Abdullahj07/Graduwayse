import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../utils/getErrorMessages";

type GraduateProfile = {
  id: number | null;
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

type FormState = {
  full_name: string;
  education_level: string;
  university: string;
  degree: string;
  grade: string;
  years_of_experience: string;
  age: string;
  location: string;
  skills: string;
  bio: string;
};

const emptyForm: FormState = {
  full_name: "",
  education_level: "",
  university: "",
  degree: "",
  grade: "",
  years_of_experience: "",
  age: "",
  location: "",
  skills: "",
  bio: "",
};

export default function GraduateProfilePage() {
  const { refreshMe } = useAuth();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [email, setEmail] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillFromProfile(profile: GraduateProfile) {
    setForm({
      full_name: profile.full_name || "",
      education_level: profile.education_level || "",
      university: profile.university || "",
      degree: profile.degree || "",
      grade: profile.grade || "",
      years_of_experience:
        profile.years_of_experience === null ? "" : String(profile.years_of_experience),
      age: profile.age === null ? "" : String(profile.age),
      location: profile.location || "",
      skills: profile.skills || "",
      bio: profile.bio || "",
    });
    setEmail(profile.email || "");
    setCvUrl(profile.cv_url || null);
  }

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<GraduateProfile>("/auth/graduate-profile/me/");
        fillFromProfile(res.data);
      } catch (err: any) {
        setError(getErrorMessage(err, "Failed to load profile."));
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (cvFile) {
        const formData = new FormData();
        formData.append("full_name", form.full_name);
        formData.append("education_level", form.education_level);
        formData.append("university", form.university);
        formData.append("degree", form.degree);
        formData.append("grade", form.grade);
        formData.append("years_of_experience", form.years_of_experience);
        formData.append("age", form.age);
        formData.append("location", form.location);
        formData.append("skills", form.skills);
        formData.append("bio", form.bio);
        formData.append("cv", cvFile);

        const res = await api.patch<GraduateProfile>(
          "/auth/graduate-profile/me/",
          formData
        );
        fillFromProfile(res.data);
      } else {
        const payload = {
          full_name: form.full_name,
          education_level: form.education_level,
          university: form.university,
          degree: form.degree,
          grade: form.grade,
          years_of_experience:
            form.years_of_experience === "" ? null : Number(form.years_of_experience),
          age: form.age === "" ? null : Number(form.age),
          location: form.location,
          skills: form.skills,
          bio: form.bio,
        };

        const res = await api.patch<GraduateProfile>(
          "/auth/graduate-profile/me/",
          payload
        );
        fillFromProfile(res.data);
      }

      setCvFile(null);
      setSuccess("Profile saved.");
      await refreshMe();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to save profile."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-600">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill this out so employers can find you more easily.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                value={email}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Education level
              </label>
              <select
                value={form.education_level}
                onChange={(e) => updateField("education_level", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select education level</option>
                <option value="BACHELORS">Bachelor&apos;s</option>
                <option value="MASTERS">Master&apos;s</option>
                <option value="PHD">PhD</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                University
              </label>
              <input
                value={form.university}
                onChange={(e) => updateField("university", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="University or institution"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Degree
              </label>
              <input
                value={form.degree}
                onChange={(e) => updateField("degree", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Computer Science, Finance, Design..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Grade
              </label>
              <input
                value={form.grade}
                onChange={(e) => updateField("grade", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="First Class, 2:1, GPA 3.8..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Years of experience
              </label>
              <input
                type="number"
                min="0"
                value={form.years_of_experience}
                onChange={(e) => updateField("years_of_experience", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Age
              </label>
              <input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="21"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="London, Manchester, Remote..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Skills
              </label>
              <textarea
                rows={3}
                value={form.skills}
                onChange={(e) => updateField("skills", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Comma-separated skills, e.g. React, Python, SQL, Figma"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Bio
              </label>
              <textarea
                rows={5}
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Write a short summary about yourself."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                CV
              </label>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                {cvUrl && (
                  <div className="mb-3 text-sm text-slate-600">
                    Current CV:{" "}
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Open CV
                    </a>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600"
                />

                {cvFile && (
                  <div className="mt-2 text-sm text-slate-500">
                    Selected: {cvFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}