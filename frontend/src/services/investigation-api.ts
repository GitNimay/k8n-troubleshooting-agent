import { api } from "@/services/api";
import type { ClustersResponse, InvestigationResponse } from "@/types/investigation";

export async function fetchClusters(token: string) {
  const response = await api.get<ClustersResponse>("/clusters", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function runInvestigation(
  token: string,
  investigationId: string,
  context?: string | null,
) {
  const response = await api.post<InvestigationResponse>(
    "/investigate",
    { context },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Investigation-Id": investigationId,
      },
    },
  );

  return response.data;
}
