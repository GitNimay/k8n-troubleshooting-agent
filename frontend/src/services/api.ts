import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 120_000,
});

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Kubernetes or AI reasoning may be taking too long. Please try again.";
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (detail && typeof detail === "object" && "message" in detail) {
    const message = String(detail.message);
    const details = Array.isArray(detail.details) ? detail.details.map(String) : [];
    if (details.length) {
      return `${message}\n\nPlease verify:\n${details.map((item: string) => `- ${item}`).join("\n")}`;
    }
    return message;
  }

  if (!error.response) {
    return "Could not reach the backend API. Please verify the FastAPI service is running.";
  }

  return `Request failed with HTTP ${error.response.status}.`;
}
