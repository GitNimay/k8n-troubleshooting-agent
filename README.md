![AI Kubernetes Troubleshooting Agent cover](https://raw.githubusercontent.com/GitNimay/Gitnimay-HostedImages/main/blog/ChatGPT%20Image%20May%2029%2C%202026%2C%2012_49_55%20PM.png)

# AI Kubernetes Troubleshooting Agent

AI Kubernetes Troubleshooting Agent is a web application that helps inspect a Kubernetes cluster, collect useful failure evidence, and generate a clear root cause report.

The project is built for developers and platform teams who want a faster way to understand common Kubernetes issues such as crashing pods, image pull failures, unhealthy deployments, service routing problems, memory limits, and cluster access errors.

## What This Project Does

The application has two main parts:

- `backend`: A FastAPI service that runs Kubernetes checks through `kubectl`, prepares structured investigation data, verifies authenticated users through InsForge, and sends unhealthy findings to OpenRouter for AI analysis.
- `frontend`: A Next.js dashboard where users sign in, select a kubeconfig context, run a cluster investigation, view live progress, read the diagnosis, and review investigation history.

In simple terms, the frontend gives you a clean interface, and the backend does the actual cluster inspection. The backend only calls the AI model when it finds critical evidence. If the cluster looks healthy, it returns a healthy result without using the LLM.

## Main Features

- Kubernetes context selection from the configured kubeconfig file.
- Cluster preflight checks before running a full investigation.
- Pod, deployment, event, log, and network evidence collection.
- AI based root cause analysis through OpenRouter.
- Structured diagnosis with root cause, explanation, suggested fix, useful `kubectl` commands, prevention notes, and confidence level.
- InsForge authentication for protected API access.
- Realtime investigation progress.
- Investigation history stored through InsForge.
- Docker Compose setup for running the backend and frontend together.
- Kubernetes failure manifests for local and end to end testing.

## Project Structure

```text
.
+ backend
  + app
    + ai
    + api
    + core
    + kubernetes
    + models
    + services
  + Dockerfile
  + requirements.txt
+ frontend
  + src
    + app
    + components
    + hooks
    + lib
    + services
    + types
  + Dockerfile
  + package.json
+ docs
+ k8s
  + test-failures
+ prompts
+ docker-compose.yml
```

## Requirements

Install these tools before running the project:

- Docker and Docker Compose.
- Node.js 22 or newer for local frontend development.
- Python 3.12 or newer for local backend development.
- `kubectl` if you run the backend directly on your machine.
- Access to a Kubernetes cluster through a valid kubeconfig file.
- An InsForge backend URL and anon key.
- An OpenRouter API key if you want AI diagnosis for unhealthy findings.

## Environment Files

The project uses environment variables for backend, frontend, and Docker Compose configuration.

### Backend

Create `backend/.env` from `backend/.env.example`.

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
KUBECONFIG_PATH=
INSFORGE_BASE_URL=
FRONTEND_ORIGIN=http://localhost:3000
```

Use these values:

- `OPENROUTER_API_KEY`: API key used by the backend to call OpenRouter.
- `OPENROUTER_MODEL`: Model name used for diagnosis, for example `openai/gpt-4o-mini`.
- `KUBECONFIG_PATH`: Path to the kubeconfig file when running the backend locally.
- `INSFORGE_BASE_URL`: Base URL of your InsForge backend.
- `FRONTEND_ORIGIN`: URL allowed by backend CORS.

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_INSFORGE_BASE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
```

Use these values:

- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL used by the browser.
- `NEXT_PUBLIC_INSFORGE_BASE_URL`: InsForge backend URL used by the frontend.
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`: InsForge anon key used by the frontend SDK.

### Docker Compose

Create a root `.env` file when you need to customize Compose values.

```env
FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_INSFORGE_BASE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
KUBECONFIG_HOST_PATH=/root/.kube/config
```

`KUBECONFIG_HOST_PATH` is the kubeconfig file on the host. Docker Compose mounts it into the backend container at `/root/.kube/config`.

## Installation With Docker Compose

Docker Compose is the recommended setup because it starts both services with the expected ports and kubeconfig mount.

1. Clone the repository.

```bash
git clone <repository-url>
cd k8n-TrubleShooting-agent
```

2. Create the required environment files.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

3. Fill in the InsForge and OpenRouter values in the environment files.

4. Set the kubeconfig path for Docker Compose.

```env
KUBECONFIG_HOST_PATH=/path/to/your/kubeconfig
```

5. Start the application.

```bash
docker compose build
docker compose up
```

6. Open the application.

```text
Frontend: http://localhost:3000
Backend health check: http://localhost:8000/health
```

## Installation Without Docker

Use this setup when you want to run the backend and frontend directly for development.

### Backend Setup

1. Open a terminal in the backend folder.

```bash
cd backend
```

2. Create and activate a virtual environment.

```bash
python -m venv .venv
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Install Python dependencies.

```bash
pip install -r requirements.txt
```

4. Create the backend environment file.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

5. Set `KUBECONFIG_PATH` in `backend/.env`.

```env
KUBECONFIG_PATH=/path/to/your/kubeconfig
```

6. Start the backend.

```bash
uvicorn app.main:app
```

### Frontend Setup

1. Open a second terminal in the frontend folder.

```bash
cd frontend
```

2. Install Node.js dependencies.

```bash
npm install
```

3. Create the frontend environment file.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

4. Start the frontend.

```bash
npm run dev
```

5. Open the dashboard at `http://localhost:3000`.

## Kubernetes Access Notes

The backend needs access to the same Kubernetes cluster that you want to inspect.

When running locally, set `KUBECONFIG_PATH` to a kubeconfig file that works with `kubectl`.

When running with Docker Compose, set `KUBECONFIG_HOST_PATH` in the root `.env` file. Compose mounts that file into the backend container as read only.

If your cluster runs inside WSL, run Docker Compose from the WSL distro that owns the kubeconfig file. For example:

```env
KUBECONFIG_HOST_PATH=/root/.kube/config
```

Then run:

```bash
cd /mnt/d/NimsWorkspace/k8n-TrubleShooting-agent
docker compose build
docker compose up
```

Kind clusters often expose the Kubernetes API on a localhost address. The backend service uses host networking in Docker Compose so the container can reach that API from the WSL host.

## InsForge Setup

InsForge is used for authentication, realtime progress, and investigation history.

You need:

- `INSFORGE_BASE_URL` for the backend.
- `NEXT_PUBLIC_INSFORGE_BASE_URL` for the frontend.
- `NEXT_PUBLIC_INSFORGE_ANON_KEY` for the frontend.

Additional setup SQL and realtime channel notes are available in [docs/insforge-setup.md](docs/insforge-setup.md).

## OpenRouter Setup

OpenRouter is used by the backend AI diagnosis layer.

Set these values in `backend/.env`:

```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The backend skips the LLM call when the investigation does not find critical cluster issues.

## API Endpoints

### Health Check

```http
GET /health
```

Returns backend health status.

### List Kubernetes Contexts

```http
GET /clusters
```

Requires an InsForge bearer token. Returns available kubeconfig contexts.

### Run Investigation

```http
POST /investigate
```

Requires an InsForge bearer token.

Example request body:

```json
{
  "context": "kind-local"
}
```

Returns the selected context, diagnosis, and raw investigation payload.

## Testing Kubernetes Failure Scenarios

Sample Kubernetes manifests are stored in `k8s/test-failures`.

They include examples for:

- Image pull failures.
- CrashLoopBackOff from missing environment values.
- OOMKilled pods.
- Service selector mismatch.

See [docs/kubernetes-failure-scenarios.md](docs/kubernetes-failure-scenarios.md) for the full test flow.

## Development Commands

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
npm run typecheck
```

Docker:

```bash
docker compose build
docker compose up
docker compose down
```

## Troubleshooting

### Backend returns authentication errors

Check that `INSFORGE_BASE_URL` is set in `backend/.env` and that the frontend is sending a valid InsForge session token.

### Frontend cannot reach the backend

Check `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`. For the default local setup, it should be `http://localhost:8000`.

### No Kubernetes contexts are shown

Check that the kubeconfig path is correct and that the backend can read the file.

For Docker Compose, confirm `KUBECONFIG_HOST_PATH` points to the host kubeconfig file.

For local backend development, confirm `KUBECONFIG_PATH` points to the local kubeconfig file.

### Investigation fails before AI diagnosis

Run `kubectl` with the same kubeconfig and context to confirm the cluster is reachable. The backend performs a preflight cluster access check before collecting evidence.

### AI diagnosis is not generated

Check that `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are set. Also note that the backend does not call the AI model when no critical findings are detected.

## Current Scope

This project currently focuses on Kubernetes troubleshooting through a web dashboard and FastAPI orchestration service. It is suitable for local development, demo environments, and early platform engineering workflows.

The current implementation includes:

- FastAPI backend.
- Next.js frontend.
- Dockerfiles and Docker Compose.
- Kubernetes investigation through `kubectl`.
- AI diagnosis through OpenRouter.
- InsForge authentication, realtime progress, and history storage.
- Context selection from the dashboard.
- Beginner friendly error messages for kubeconfig, cluster access, authentication, timeout, and API failures.
