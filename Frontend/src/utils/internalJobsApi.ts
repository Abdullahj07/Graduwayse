import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token");

  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function fetchGraduateInternalJobs() {
  const response = await axios.get(
    `${API_BASE_URL}/internal-jobs/graduate/active/`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

export async function removeEmployerInternalJob(jobId: number) {
  const response = await axios.delete(
    `${API_BASE_URL}/internal-jobs/employer/jobs/${jobId}/remove/`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}