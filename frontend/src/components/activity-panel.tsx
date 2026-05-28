"use client";

import { useHealth } from "@/hooks/use-health";

export function ActivityPanel() {
  const { data, isError, isLoading } = useHealth();
  const isReady = data?.status === "healthy";
  const status = isLoading ? "Checking" : isReady ? "Ready" : isError ? "Offline" : "Ready";

  return (
    <div className="mt-12 w-full max-w-xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        Investigate Cluster
      </button>

      <div className="mt-6 flex items-center gap-3 text-sm text-slate-300">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isError ? "bg-rose-400" : isLoading ? "bg-amber-300" : "bg-emerald-400"
          }`}
          aria-hidden="true"
        />
        <span>
          System Status: <span className="font-semibold text-white">{status}</span>
        </span>
      </div>
    </div>
  );
}

