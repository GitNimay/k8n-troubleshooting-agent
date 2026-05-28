"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { insforge, isInsForgeConfigured } from "@/lib/insforge";
import type { ProgressStep } from "@/types/investigation";

export const DEFAULT_PROGRESS_STEPS: ProgressStep[] = [
  { step: "checking_pods", label: "Checking Pods", status: "pending" },
  { step: "reading_logs", label: "Reading Logs", status: "pending" },
  { step: "analyzing_events", label: "Analyzing Events", status: "pending" },
  { step: "inspecting_deployments", label: "Inspecting Deployments", status: "pending" },
  { step: "checking_networking", label: "Checking Networking", status: "pending" },
  { step: "ai_reasoning", label: "AI Reasoning", status: "pending" },
  { step: "root_cause_found", label: "Root Cause Found", status: "pending" },
];

type ProgressMessage = ProgressStep & {
  investigationId?: string;
};

export function useRealtimeProgress() {
  const [steps, setSteps] = useState<ProgressStep[]>(DEFAULT_PROGRESS_STEPS);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const activeChannelRef = useRef<string | null>(null);
  const activeInvestigationRef = useRef<string | null>(null);

  useEffect(() => {
    function handleProgress(message: ProgressMessage) {
      if (message.investigationId !== activeInvestigationRef.current) {
        return;
      }

      setSteps((current) =>
        current.map((item) =>
          item.step === message.step
            ? {
                ...item,
                status: message.status,
                timestamp: message.timestamp,
              }
            : item,
        ),
      );
    }

    insforge.realtime.on("progress", handleProgress);

    return () => {
      insforge.realtime.off("progress", handleProgress);
      if (activeChannelRef.current) {
        insforge.realtime.unsubscribe(activeChannelRef.current);
      }
    };
  }, []);

  const begin = useCallback(async (investigationId: string) => {
    setConnectionError(null);
    setSteps(DEFAULT_PROGRESS_STEPS);
    activeInvestigationRef.current = investigationId;

    if (!isInsForgeConfigured()) {
      setConnectionError("InsForge realtime is not configured.");
      return;
    }

    const channel = `investigation:${investigationId}`;
    if (activeChannelRef.current && activeChannelRef.current !== channel) {
      insforge.realtime.unsubscribe(activeChannelRef.current);
    }
    activeChannelRef.current = channel;

    try {
      await insforge.realtime.connect();
      const subscription = await insforge.realtime.subscribe(channel);
      if (!subscription.ok) {
        setConnectionError(subscription.error.message);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Realtime connection failed.");
    }
  }, []);

  const completeRemaining = useCallback(() => {
    setSteps((current) =>
      current.map((item) => (item.status === "pending" ? { ...item, status: "completed" } : item)),
    );
  }, []);

  const markFailed = useCallback(() => {
    setSteps((current) => {
      const runningIndex = current.findIndex((item) => item.status === "running");
      const pendingIndex = current.findIndex((item) => item.status === "pending");
      const failedIndex = runningIndex >= 0 ? runningIndex : pendingIndex;

      return current.map((item, index) =>
        index === failedIndex ? { ...item, status: "failed" } : item,
      );
    });
  }, []);

  return {
    steps,
    begin,
    completeRemaining,
    markFailed,
    connectionError,
  };
}
