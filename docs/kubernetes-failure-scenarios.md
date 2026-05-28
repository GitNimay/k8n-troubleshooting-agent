# Kubernetes Failure Scenarios

Use these manifests to test the investigation flow against real Kubernetes failures.

## Apply Test Failures

Replace `<context>` with the context selected in the dashboard.

```bash
kubectl --context <context> apply -f k8s/test-failures/namespace.yaml
kubectl --context <context> apply -f k8s/test-failures/crashloop-missing-env.yaml
kubectl --context <context> apply -f k8s/test-failures/imagepull-bad-tag.yaml
kubectl --context <context> apply -f k8s/test-failures/oomkilled-low-memory.yaml
kubectl --context <context> apply -f k8s/test-failures/service-selector-mismatch.yaml
```

Wait 1-3 minutes, then click **Investigate Cluster** in the dashboard.

## Expected Findings

| Scenario | Expected Signal | Expected Diagnosis |
| --- | --- | --- |
| CrashLoopBackOff | `DATABASE_URL environment variable is missing` in logs | Missing environment variable |
| ImagePullBackOff | `ErrImagePull` or `ImagePullBackOff` events | Invalid image tag |
| OOMKilled | Last terminated state is `OOMKilled` | Container exceeded memory limit |
| Service selector mismatch | Service has selectors but no ready endpoints | Service selector does not match pod labels |

## Cleanup

```bash
kubectl --context <context> delete namespace ai-k8s-agent-test
```

## Docker And WSL Note

If your cluster runs inside WSL, the backend container must be able to read the same kubeconfig and reach the same cluster network. The simplest path is to run Docker Compose from WSL, then set:

```env
KUBECONFIG_PATH=/root/.kube/config
```

If you run Docker Compose from Windows, mount the WSL kubeconfig into the backend container and set `KUBECONFIG_PATH` to the mounted container path.
