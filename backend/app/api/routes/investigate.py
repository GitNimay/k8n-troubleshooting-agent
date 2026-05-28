from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.ai.agent import reason_about_cluster
from app.kubernetes.clusters import (
    KubernetesAccessError,
    list_kubeconfig_contexts,
    preflight_cluster_access,
    validate_context,
)
from app.services.auth_service import extract_bearer_token, verify_insforge_user
from app.services.investigation_service import (
    build_healthy_diagnosis,
    has_critical_findings,
    run_investigation,
)
from app.services.realtime_progress import InvestigationProgressPublisher

router = APIRouter(tags=["investigation"])


class InvestigationRequest(BaseModel):
    context: str | None = None


@router.get("/clusters")
def list_clusters(authorization: str | None = Header(default=None)) -> dict:
    token = extract_bearer_token(authorization)
    verify_insforge_user(token)

    try:
        return list_kubeconfig_contexts()
    except KubernetesAccessError as error:
        raise _kubernetes_http_error(error) from error


@router.post("/investigate")
def investigate_cluster(
    payload: InvestigationRequest | None = None,
    authorization: str | None = Header(default=None),
    x_investigation_id: str | None = Header(default=None),
) -> dict:
    token = extract_bearer_token(authorization)
    user = verify_insforge_user(token)
    requested_context = payload.context if payload else None

    with InvestigationProgressPublisher(x_investigation_id, token, user.get("id")) as progress:
        try:
            context = validate_context(requested_context)
            preflight_cluster_access(context)
            investigation = run_investigation(progress.publish, context=context)
        except KubernetesAccessError as error:
            progress.publish("checking_pods", "Checking Pods", "failed")
            raise _kubernetes_http_error(error) from error

        progress.publish("ai_reasoning", "AI Reasoning", "running")

        if has_critical_findings(investigation):
            diagnosis = reason_about_cluster(investigation)
        else:
            diagnosis = build_healthy_diagnosis(context)

        progress.publish("ai_reasoning", "AI Reasoning", "completed")
        progress.publish("root_cause_found", "Root Cause Found", "completed")

    return {
        "status": "success",
        "user_id": user.get("id"),
        "context": context,
        "diagnosis": diagnosis,
        "investigation": investigation,
    }


def _kubernetes_http_error(error: KubernetesAccessError) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "message": error.message,
            "details": error.details,
        },
    )
