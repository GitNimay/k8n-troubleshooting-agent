export type Diagnosis = {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_commands: string[];
  prevention: string;
  confidence: number;
  confidence_reasoning: string[];
};

export type InvestigationResponse = {
  status: "success";
  user_id?: string;
  context?: string | null;
  diagnosis: Diagnosis;
  investigation: Record<string, unknown>;
};

export type ClusterContext = {
  name: string;
  cluster: string;
  user: string;
  namespace: string;
  current: boolean;
};

export type ClustersResponse = {
  status: "success";
  current_context: string | null;
  clusters: ClusterContext[];
};

export type ProgressStatus = "pending" | "running" | "completed" | "failed";

export type ProgressStep = {
  step: string;
  label: string;
  status: ProgressStatus;
  timestamp?: string;
};

export type InvestigationHistory = {
  id?: string;
  created_at?: string;
  root_cause: string;
  namespace: string;
  confidence: number;
  status: string;
};
