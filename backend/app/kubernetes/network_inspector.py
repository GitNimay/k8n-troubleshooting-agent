from app.kubernetes.executor import run_kubectl
from app.kubernetes.json_utils import parse_json_result


def inspect_network(context: str | None = None) -> dict:
    services_result = run_kubectl(["get", "svc", "-A", "-o", "json"], context=context)
    endpoints_result = run_kubectl(["get", "endpoints", "-A", "-o", "json"], context=context)

    services_payload, services_error = parse_json_result(services_result)
    endpoints_payload, endpoints_error = parse_json_result(endpoints_result)

    if services_error or endpoints_error:
        return {
            "healthy": False,
            "error": services_error or endpoints_error,
            "findings": [],
            "raw": {
                "services": services_result.to_dict(),
                "endpoints": endpoints_result.to_dict(),
            },
        }

    endpoints_by_key = {
        _resource_key(item): item for item in endpoints_payload.get("items", [])
    }

    findings = []
    for service in services_payload.get("items", []):
        metadata = service.get("metadata", {})
        spec = service.get("spec", {})
        service_type = spec.get("type")
        selector = spec.get("selector", {})

        if service_type == "ExternalName":
            continue

        if selector and not _endpoint_has_addresses(endpoints_by_key.get(_resource_key(service), {})):
            findings.append(
                {
                    "namespace": metadata.get("namespace", "default"),
                    "service": metadata.get("name", "unknown"),
                    "issue": "Missing endpoints",
                    "detail": "Service has selectors but no ready endpoint addresses. Check selector labels and backing pods.",
                    "selector": selector,
                }
            )

    dns_findings = _inspect_dns_services(services_payload)
    findings.extend(dns_findings)

    return {
        "healthy": len(findings) == 0,
        "total_services": len(services_payload.get("items", [])),
        "findings": findings,
    }


def _resource_key(item: dict) -> tuple[str, str]:
    metadata = item.get("metadata", {})
    return (
        metadata.get("namespace", "default"),
        metadata.get("name", "unknown"),
    )


def _endpoint_has_addresses(endpoint: dict) -> bool:
    for subset in endpoint.get("subsets", []):
        if subset.get("addresses"):
            return True
    return False


def _inspect_dns_services(services_payload: dict) -> list[dict]:
    kube_system_services = [
        service
        for service in services_payload.get("items", [])
        if service.get("metadata", {}).get("namespace") == "kube-system"
    ]
    dns_services = {
        service.get("metadata", {}).get("name")
        for service in kube_system_services
        if service.get("metadata", {}).get("name") in {"kube-dns", "coredns"}
    }

    if dns_services:
        return []

    return [
        {
            "namespace": "kube-system",
            "service": "kube-dns",
            "issue": "DNS service not found",
            "detail": "Could not find kube-dns or coredns service in kube-system.",
        }
    ]
