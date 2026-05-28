import { api } from "@/services/api";
import type { HealthResponse } from "@/types/health";

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

