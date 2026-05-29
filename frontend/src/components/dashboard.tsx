"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth-panel";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { HistoryTable } from "@/components/history-table";
import { ProgressList } from "@/components/progress-list";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeProgress } from "@/hooks/use-realtime-progress";
import { getApiErrorMessage } from "@/services/api";
import { fetchInvestigationHistory, saveInvestigationHistory } from "@/services/history";
import { fetchClusters, runInvestigation } from "@/services/investigation-api";
import type { ClusterContext, Diagnosis, ProgressStep } from "@/types/investigation";

type WorkspaceView = "cluster" | "analyse" | "result";

const workspaceViews: { id: WorkspaceView; label: string; marker: string }[] = [
  { id: "cluster", label: "Cluster", marker: "[1]" },
  { id: "analyse", label: "Analyse", marker: "[2]" },
  { id: "result", label: "Result", marker: "[3]" },
];

export function Dashboard() {
  const { user, token, isLoaded, signOut } = useAuth();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("cluster");
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

  const selectedCluster = useMemo(
    () => clustersQuery.data?.clusters.find((cluster) => cluster.name === selectedContext) ?? null,
    [clustersQuery.data?.clusters, selectedContext],
  );

  const completedSteps = progress.steps.filter((step) => step.status === "completed").length;
  const progressLabel = `${completedSteps}/${progress.steps.length}`;
  const hasResult = Boolean(diagnosis);

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
      setActiveView("analyse");
    },
    onSuccess: async (response) => {
      progress.completeRemaining();
      setDiagnosis(response.diagnosis);
      setActiveView("result");

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
      setActiveView("analyse");
    },
  });

  if (!isLoaded) {
    return (
      <main className="app-canvas min-h-screen px-6 py-10 text-[#201d1d]">
        <section className="mx-auto max-w-[960px] page-enter">[+] Loading workspace...</section>
      </main>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <main className="app-canvas min-h-screen px-4 py-6 text-[#201d1d] sm:px-6 sm:py-10">
      <section className="mx-auto max-w-[1100px]">
        <header className="border-b border-[rgba(15,0,0,0.12)] pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm leading-7 text-[#646262]">[k8n-troubleshooting]</p>
              <h1 className="max-w-[820px] text-[30px] font-bold leading-[1.35] sm:text-[38px] sm:leading-[1.5]">
                AI Kubernetes Agent
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded border border-[rgba(15,0,0,0.12)] bg-[#f8f7f7] px-2 py-1 text-sm leading-6 text-[#646262]">
                {user.email}
              </span>
              <button type="button" onClick={signOut} className="button-secondary w-fit">
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="terminal-panel mt-10 px-4 py-5 page-enter sm:px-6 sm:py-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <pre className="overflow-hidden text-[10px] font-bold leading-[1.1] text-[#fdfcfc] sm:text-xs">
{` _  __ ___  _   _ 
| |/ // _ \\| \\ | |
| ' /| (_) |  \\| |
|_|\\_\\\\___/|_|\\_|`}
              </pre>
              <p className="mt-5 max-w-[700px] text-base leading-6 text-[#fdfcfc]">
                Select a kube context, run evidence gathering, and read the root-cause report
                without leaving the console flow.
              </p>
            </div>
            <div className="terminal-row p-3 text-sm leading-6">
              <p>
                <span className="text-[#9a9898]">context</span> {selectedContext ?? "unselected"}
              </p>
              <p>
                <span className="text-[#9a9898]">progress</span> {progressLabel} steps
              </p>
              <p>
                <span className="text-[#9a9898]">result</span> {hasResult ? "available" : "pending"}
              </p>
            </div>
          </div>
        </section>

        <nav
          aria-label="Workspace"
          className="mt-8 flex overflow-x-auto border-b border-[rgba(15,0,0,0.12)]"
        >
          {workspaceViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`tab-button whitespace-nowrap ${
                activeView === view.id ? "tab-button-active" : ""
              }`}
              aria-current={activeView === view.id ? "page" : undefined}
            >
              {view.marker} {view.label}
            </button>
          ))}
        </nav>

        {activeView === "cluster" ? (
          <ClusterPage
            clusters={clustersQuery.data?.clusters ?? []}
            isLoading={clustersQuery.isLoading}
            error={clustersQuery.error}
            selectedContext={selectedContext}
            selectedCluster={selectedCluster}
            onSelect={setSelectedContext}
            onRefresh={() => clustersQuery.refetch()}
            onInvestigate={() => investigationMutation.mutate()}
            isInvestigating={investigationMutation.isPending}
            canInvestigate={Boolean(token && selectedContext)}
          />
        ) : null}

        {activeView === "analyse" ? (
          <AnalysePage
            selectedCluster={selectedCluster}
            selectedContext={selectedContext}
            isInvestigating={investigationMutation.isPending}
            canInvestigate={Boolean(token && selectedContext)}
            onInvestigate={() => investigationMutation.mutate()}
            connectionError={progress.connectionError}
            runError={runError}
            progressLabel={progressLabel}
            steps={progress.steps}
            onChooseCluster={() => setActiveView("cluster")}
          />
        ) : null}

        {activeView === "result" ? (
          <ResultPage
            diagnosis={diagnosis}
            history={historyQuery.data ?? []}
            historyError={
              historyQuery.error instanceof Error ? historyQuery.error.message : undefined
            }
            onAnalyseAgain={() => setActiveView("analyse")}
          />
        ) : null}
      </section>
    </main>
  );
}

function ClusterPage({
  clusters,
  isLoading,
  error,
  selectedContext,
  selectedCluster,
  onSelect,
  onRefresh,
  onInvestigate,
  isInvestigating,
  canInvestigate,
}: Readonly<{
  clusters: ClusterContext[];
  isLoading: boolean;
  error: unknown;
  selectedContext: string | null;
  selectedCluster: ClusterContext | null;
  onSelect: (context: string) => void;
  onRefresh: () => void;
  onInvestigate: () => void;
  isInvestigating: boolean;
  canInvestigate: boolean;
}>) {
  return (
    <section className="mt-12 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm leading-7 text-[#646262]">[page:cluster]</p>
          <h2 className="text-base font-bold leading-6">Kubernetes Cluster Selection</h2>
        </div>
        <button type="button" onClick={onRefresh} className="button-secondary w-fit">
          Refresh
        </button>
      </div>

      <p className="mt-6 max-w-[760px] text-base leading-6 text-[#424245]">
        Choose the kubeconfig context the agent should inspect. The current context is preselected
        when the API returns it.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="hairline-panel">
          {isLoading ? (
            <p className="border-b border-[rgba(15,0,0,0.12)] py-3 text-[#646262] row-enter">
              [+] Loading kubeconfig contexts...
            </p>
          ) : null}
          {error ? (
            <p className="whitespace-pre-line border-b border-[rgba(15,0,0,0.12)] py-3 text-[#ff3b30] row-enter">
              [-] {getApiErrorMessage(error)}
            </p>
          ) : null}
          {!isLoading && clusters.length === 0 ? (
            <p className="border-b border-[rgba(15,0,0,0.12)] py-3 text-[#646262] row-enter">
              [ ] No kubeconfig contexts were found.
            </p>
          ) : null}
          {clusters.map((cluster, index) => {
            const selected = selectedContext === cluster.name;
            return (
              <button
                type="button"
                key={cluster.name}
                onClick={() => onSelect(cluster.name)}
                style={{ animationDelay: `${index * 45}ms` }}
                className="row-enter flex w-full flex-col border-b border-[rgba(15,0,0,0.12)] py-3 text-left leading-6 transition-colors hover:bg-[#f8f7f7] sm:flex-row sm:items-center sm:justify-between"
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

        <aside className="hairline-panel py-4">
          <p className="text-sm leading-7 text-[#646262]">[selection]</p>
          <p className="mt-2 break-words text-base font-bold leading-6">
            {selectedCluster?.name ?? "No context selected"}
          </p>
          <dl className="mt-4 space-y-2 text-sm leading-6 text-[#424245]">
            <div>
              <dt className="inline text-[#646262]">cluster </dt>
              <dd className="inline">{selectedCluster?.cluster ?? "-"}</dd>
            </div>
            <div>
              <dt className="inline text-[#646262]">namespace </dt>
              <dd className="inline">{selectedCluster?.namespace ?? "-"}</dd>
            </div>
            <div>
              <dt className="inline text-[#646262]">user </dt>
              <dd className="inline">{selectedCluster?.user ?? "-"}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onInvestigate}
            disabled={isInvestigating || !canInvestigate}
            className="button-primary mt-6"
          >
            {isInvestigating ? "Investigating..." : "Investigate Cluster"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function AnalysePage({
  selectedCluster,
  selectedContext,
  isInvestigating,
  canInvestigate,
  onInvestigate,
  connectionError,
  runError,
  progressLabel,
  steps,
  onChooseCluster,
}: Readonly<{
  selectedCluster: ClusterContext | null;
  selectedContext: string | null;
  isInvestigating: boolean;
  canInvestigate: boolean;
  onInvestigate: () => void;
  connectionError: string | null;
  runError: string | null;
  progressLabel: string;
  steps: ProgressStep[];
  onChooseCluster: () => void;
}>) {
  return (
    <section className="mt-12 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm leading-7 text-[#646262]">[page:analyse]</p>
          <h2 className="text-base font-bold leading-6">Live Investigation</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onChooseCluster} className="button-secondary">
            Choose Cluster
          </button>
          <button
            type="button"
            onClick={onInvestigate}
            disabled={isInvestigating || !canInvestigate}
            className="button-primary"
          >
            {isInvestigating ? "Running..." : "Run Analyse"}
          </button>
        </div>
      </div>

      <div className="terminal-panel mt-8 px-4 py-4 sm:px-5">
        <p className="text-sm leading-7 text-[#9a9898]">[command]</p>
        <div className="terminal-row mt-2 p-3 text-sm leading-6 sm:text-base">
          <span className={isInvestigating ? "pulse-marker" : ""}>
            {isInvestigating ? "[+]" : "[ ]"}
          </span>{" "}
          k8n investigate --context "{selectedContext ?? "unset"}" --namespace "
          {selectedCluster?.namespace ?? "default"}"
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm leading-7 text-[#646262]">
        <span>context={selectedContext ?? "unselected"}</span>
        <span>progress={progressLabel}</span>
        <span>mode=ai-root-cause</span>
      </div>

      {isInvestigating ? (
        <p className="mt-3 text-sm leading-7 text-[#646262]">
          <span className="pulse-marker inline-block">[+]</span> Investigating Kubernetes cluster...
        </p>
      ) : null}
      {connectionError ? (
        <p className="mt-3 text-sm leading-6 text-[#ff9f0a]">[-] {connectionError}</p>
      ) : null}
      {runError ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#ff3b30]">[-] {runError}</p>
      ) : null}

      <ProgressList steps={steps} />
    </section>
  );
}

function ResultPage({
  diagnosis,
  history,
  historyError,
  onAnalyseAgain,
}: Readonly<{
  diagnosis: Diagnosis | null;
  history: Parameters<typeof HistoryTable>[0]["history"];
  historyError?: string;
  onAnalyseAgain: () => void;
}>) {
  return (
    <section className="mt-12 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm leading-7 text-[#646262]">[page:result]</p>
          <h2 className="text-base font-bold leading-6">Root Cause Report</h2>
        </div>
        <button type="button" onClick={onAnalyseAgain} className="button-secondary w-fit">
          Analyse Again
        </button>
      </div>
      <DiagnosisPanel diagnosis={diagnosis} />
      <HistoryTable history={history} error={historyError} />
    </section>
  );
}
