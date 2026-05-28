"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/auth-panel";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { HistoryTable } from "@/components/history-table";
import { ProgressList } from "@/components/progress-list";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeProgress } from "@/hooks/use-realtime-progress";
import { getApiErrorMessage } from "@/services/api";
import { fetchInvestigationHistory, saveInvestigationHistory } from "@/services/history";
import { fetchClusters, runInvestigation } from "@/services/investigation-api";
import type { Diagnosis } from "@/types/investigation";

export function Dashboard() {
  const { user, token, isLoaded, signOut } = useAuth();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const progress = useRealtimeProgress();
  const queryClient = useQueryClient();

  const clustersQuery = useQuery({
    queryKey: ["clusters", user?.id],
    queryFn: () => fetchClusters(token!),
    enabled: Boolean(user && token),
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ["investigations", user?.id],
    queryFn: () => fetchInvestigationHistory(user!.id),
    enabled: Boolean(user),
    retry: 1,
  });

  useEffect(() => {
    if (!clustersQuery.data?.clusters.length || selectedContext) {
      return;
    }

    const current = clustersQuery.data.clusters.find((cluster) => cluster.current);
    setSelectedContext((current ?? clustersQuery.data.clusters[0]).name);
  }, [clustersQuery.data, selectedContext]);

  const investigationMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Please sign in again before investigating.");
      }
      if (!selectedContext) {
        throw new Error("Please select a Kubernetes cluster before investigating.");
      }

      const investigationId = crypto.randomUUID();
      await progress.begin(investigationId);
      return runInvestigation(token, investigationId, selectedContext);
    },
    onMutate: () => {
      setRunError(null);
      setDiagnosis(null);
    },
    onSuccess: async (response) => {
      progress.completeRemaining();
      setDiagnosis(response.diagnosis);

      if (user) {
        try {
          await saveInvestigationHistory({
            userId: user.id,
            diagnosis: response.diagnosis,
            investigation: response.investigation,
          });
          await queryClient.invalidateQueries({ queryKey: ["investigations", user.id] });
        } catch (error) {
          setRunError(error instanceof Error ? error.message : "Could not save history.");
        }
      }
    },
    onError: (error) => {
      progress.markFailed();
      setRunError(getApiErrorMessage(error));
    },
  });

  if (!isLoaded) {
    return <main className="min-h-screen bg-[#fdfcfc] px-6 py-10 text-[#201d1d]">Loading...</main>;
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <main className="min-h-screen bg-[#fdfcfc] px-6 py-10 text-[#201d1d]">
      <section className="mx-auto max-w-[960px]">
        <header className="flex flex-col gap-4 border-b border-[rgba(15,0,0,0.12)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm leading-7 text-[#646262]">[dashboard]</p>
            <h1 className="text-[32px] font-bold leading-[1.5] sm:text-[38px]">
              AI Kubernetes Agent
            </h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-fit min-h-9 rounded border border-[#646262] bg-[#fdfcfc] px-5 text-base font-medium leading-8"
          >
            Logout
          </button>
        </header>

        <section className="mt-16">
          <p className="max-w-[680px] text-base leading-6 text-[#424245]">
            Troubleshoot Kubernetes with AI. Start an investigation, watch the evidence-gathering
            steps, then review the diagnosis.
          </p>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold leading-6">Kubernetes Cluster</h2>
              <button
                type="button"
                onClick={() => clustersQuery.refetch()}
                className="min-h-8 rounded border border-[#646262] bg-[#fdfcfc] px-3 text-sm leading-7"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 border-t border-[rgba(15,0,0,0.12)]">
              {clustersQuery.isLoading ? (
                <p className="border-b border-[rgba(15,0,0,0.12)] py-3 text-[#646262]">
                  [+] Loading kubeconfig contexts...
                </p>
              ) : null}
              {clustersQuery.error ? (
                <p className="whitespace-pre-line border-b border-[rgba(15,0,0,0.12)] py-3 text-[#ff3b30]">
                  [-] {getApiErrorMessage(clustersQuery.error)}
                </p>
              ) : null}
              {clustersQuery.data?.clusters.length === 0 ? (
                <p className="border-b border-[rgba(15,0,0,0.12)] py-3 text-[#646262]">
                  [ ] No kubeconfig contexts were found.
                </p>
              ) : null}
              {clustersQuery.data?.clusters.map((cluster) => {
                const selected = selectedContext === cluster.name;
                return (
                  <button
                    type="button"
                    key={cluster.name}
                    onClick={() => setSelectedContext(cluster.name)}
                    className="flex w-full flex-col border-b border-[rgba(15,0,0,0.12)] py-3 text-left leading-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium">
                      {selected ? "[x]" : "[ ]"} {cluster.name}
                    </span>
                    <span className="text-sm leading-7 text-[#646262]">
                      cluster={cluster.cluster} namespace={cluster.namespace}
                      {cluster.current ? " current" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => investigationMutation.mutate()}
            disabled={investigationMutation.isPending || !token || !selectedContext}
            className="mt-6 min-h-9 rounded bg-[#201d1d] px-5 text-base font-medium leading-8 text-[#fdfcfc] disabled:bg-[#f1eeee] disabled:text-[#9a9898]"
          >
            {investigationMutation.isPending ? "Investigating..." : "Investigate Cluster"}
          </button>
          {investigationMutation.isPending ? (
            <p className="mt-3 text-sm leading-7 text-[#646262]">
              [+] Investigating Kubernetes Cluster...
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-7 text-[#646262]">Signed in as {user.email}</p>
          {progress.connectionError ? (
            <p className="mt-3 text-sm leading-6 text-[#ff9f0a]">[-] {progress.connectionError}</p>
          ) : null}
          {runError ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#ff3b30]">
              [-] {runError}
            </p>
          ) : null}
        </section>

        <ProgressList steps={progress.steps} />
        <DiagnosisPanel diagnosis={diagnosis} />
        <HistoryTable
          history={historyQuery.data ?? []}
          error={historyQuery.error instanceof Error ? historyQuery.error.message : undefined}
        />
      </section>
    </main>
  );
}
