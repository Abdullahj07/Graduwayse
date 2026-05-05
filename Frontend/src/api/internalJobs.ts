import { api } from "./client";

export type InternalJob = {
  id: number;
  title: string;
  company_name: string;
  location: string;
  description: string;
  level: string;
  category?: string;
  is_active?: boolean;
  employer_id?: number | null;
  source?: "MANUAL" | "ADZUNA" | "REED";
  external_url?: string;
  external_created_at?: string | null;
  can_apply_in_app?: boolean;
  created_at?: string;
};

export type PaginatedJobsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: InternalJob[];
};

export type CreateInternalJobPayload = {
  title: string;
  company_name: string;
  location: string;
  description: string;
  level: string;
};

export async function listInternalJobs(params?: {
  source?: "MANUAL" | "ADZUNA" | "REED";
  page?: number;
  page_size?: number;
  level?: string;
  category?: string;
  ordering?: string;
}) {
  const res = await api.get<PaginatedJobsResponse>("/internal-jobs/", {
    params,
  });
  return res.data;
}

export async function listMyInternalJobs() {
  const res = await api.get<InternalJob[]>("/internal-jobs/mine/");
  return res.data;
}

export async function createInternalJob(payload: CreateInternalJobPayload) {
  const res = await api.post<InternalJob>("/internal-jobs/", payload);
  return res.data;
}

export async function syncAdzunaJobs() {
  const res = await api.post("/internal-jobs/sync/");
  return res.data;
}

export async function syncReedJobs() {
  const res = await api.post("/internal-jobs/sync-reed/");
  return res.data;
}