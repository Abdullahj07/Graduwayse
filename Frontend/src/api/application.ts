import { api } from "./client";

export type JobApplicant = {
  id: number;
  job: number;
  applicant: {
    id: number;
    email: string;
    full_name: string;
    role: "GRADUATE" | "EMPLOYER";
  };
  full_name: string;
  age: number | null;
  location: string;
  cv: string | null;
  cv_url: string | null;
  status: string;
  feedback: string;
  unread_messages: number;
  created_at: string;
};

export type MyApplication = {
  id: number;
  job: number;
  job_title: string;
  applicant: number;
  applicant_name: string;
  applicant_email: string;
  full_name: string;
  age: number | null;
  location: string;
  cv: string | null;
  cv_url: string | null;
  status: string;
  feedback: string;
  unread_messages: number;
  created_at: string;
};

export type ApplyForJobPayload = {
  job: number;
  full_name: string;
  age: number;
  location: string;
  cv: File;
};

export async function applyForJob(payload: ApplyForJobPayload) {
  const formData = new FormData();
  formData.append("job", String(payload.job));
  formData.append("full_name", payload.full_name);
  formData.append("age", String(payload.age));
  formData.append("location", payload.location);
  formData.append("cv", payload.cv);

  const res = await api.post<MyApplication>("/applications/apply/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function getApplicantsForJob(jobId: number) {
  const res = await api.get<JobApplicant[]>(`/applications/job/${jobId}/`);
  return res.data;
}

export async function updateApplicationStatus(
  applicationId: number,
  status: string,
  feedback: string
) {
  const res = await api.patch<JobApplicant>(
    `/applications/${applicationId}/status/`,
    { status, feedback }
  );

  return res.data;
}

export async function getMyApplications() {
  const res = await api.get<MyApplication[]>(`/applications/mine/`);
  return res.data;
}