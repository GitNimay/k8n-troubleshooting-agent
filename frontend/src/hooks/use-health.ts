import { useQuery } from "@tanstack/react-query";

import { getHealth } from "@/services/health";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 30_000,
  });
}

