import { insforge } from "@/lib/insforge";
import type { Diagnosis, InvestigationHistory } from "@/types/investigation";

const TABLE_NAME = "investigations";

export async function fetchInvestigationHistory(userId: string): Promise<InvestigationHistory[]> {
  const { data, error } = await insforge.database
    .from(TABLE_NAME)
    .select("id,created_at,root_cause,namespace,confidence,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message ?? "Could not load investigation history");
  }

  return data ?? [];
}

export async function saveInvestigationHistory(input: {
  userId: string;
  diagnosis: Diagnosis;
  investigation: Record<string, unknown>;
}) {
  const namespace = findNamespace(input.investigation);

  const { error } = await insforge.database.from(TABLE_NAME).insert([
    {
      user_id: input.userId,
      root_cause: input.diagnosis.root_cause,
      namespace,
      confidence: input.diagnosis.confidence,
      status: "completed",
      diagnosis: input.diagnosis,
      investigation: input.investigation,
    },
  ]);

  if (error) {
    throw new Error(error.message ?? "Could not save investigation history");
  }
}

function findNamespace(investigation: Record<string, unknown>) {
  const pods = investigation.pods as { problematic_pods?: Array<{ namespace?: string }> } | undefined;
  const podNamespace = pods?.problematic_pods?.[0]?.namespace;
  if (podNamespace) {
    return podNamespace;
  }

  const deployments = investigation.deployments as
    | { unhealthy_deployments?: Array<{ namespace?: string }> }
    | undefined;
  const deploymentNamespace = deployments?.unhealthy_deployments?.[0]?.namespace;
  if (deploymentNamespace) {
    return deploymentNamespace;
  }

  const network = investigation.network as { findings?: Array<{ namespace?: string }> } | undefined;
  return network?.findings?.[0]?.namespace ?? "unknown";
}

