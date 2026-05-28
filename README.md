# AI Kubernetes Troubleshooting Agent

Foundation for an on-demand AI Kubernetes troubleshooting system.

## Services

- `backend`: FastAPI orchestrator on port `8000`
- `frontend`: Next.js app on port `3000`

## Run With Docker

```bash
docker compose up --build
```

Then open:

- http://localhost:3000
- http://localhost:8000/health

## API

Health check:

```http
GET /health
```

Kubernetes investigation and AI diagnosis:

```http
POST /investigate
```

List kubeconfig contexts:

```http
GET /clusters
```

The investigation endpoint uses `kubectl` internally, collects structured evidence for the selected kubeconfig context, sends unhealthy evidence to the AI reasoning layer through OpenRouter, and returns a diagnosis plus the raw investigation payload. If no critical issues are detected, it returns a healthy-cluster diagnosis without calling the LLM.

If your cluster is inside WSL, run Docker Compose from the WSL distro that owns the kubeconfig or mount that kubeconfig into the backend container. This project mounts `${KUBECONFIG_HOST_PATH}` to `/root/.kube/config` inside the backend container.

For your WSL root kubeconfig:

```env
KUBECONFIG_HOST_PATH=/root/.kube/config
```

Then run Compose from WSL:

```bash
cd /mnt/d/NimsWorkspace/k8n-TrubleShooting-agent
docker compose up --build
```

Kind clusters often store a kubeconfig server like `https://127.0.0.1:<port>`. The backend service uses host networking in Docker Compose so that `127.0.0.1` inside the backend container reaches the WSL host where kind exposes the Kubernetes API.

## Environment

Backend values:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
KUBECONFIG_PATH=
INSFORGE_BASE_URL=
```

Frontend value:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_INSFORGE_BASE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
```

InsForge setup SQL and realtime channel notes are in [docs/insforge-setup.md](docs/insforge-setup.md).

Real Kubernetes failure manifests for end-to-end testing are in [docs/kubernetes-failure-scenarios.md](docs/kubernetes-failure-scenarios.md).

## Current Scope

This setup currently includes:

- FastAPI app and `/health` endpoint
- Next.js homepage
- Dockerfiles and Docker Compose
- Kubernetes investigation through `kubectl`
- AI diagnosis through OpenRouter using `OPENROUTER_API_KEY`
- InsForge authentication, realtime progress, and investigation history
- Kubeconfig context selection from the dashboard
- Beginner-friendly errors for missing kubeconfig, cluster access, auth, timeout, and API failures
- Structured root cause, explanation, suggested fix, kubectl commands, prevention, and confidence
