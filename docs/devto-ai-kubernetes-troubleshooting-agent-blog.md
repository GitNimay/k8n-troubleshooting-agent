# Building an AI Kubernetes Troubleshooting Agent with FastAPI, Next.js, Docker, InsForge, and OpenRouter

Estimated reading time: 15 minutes

Repository: [GitNimay/k8n-troubleshooting-agent](https://github.com/GitNimay/k8n-troubleshooting-agent.git)

Kubernetes is powerful, but when something breaks, the first few minutes can feel messy. A pod is restarting. Another pod cannot pull an image. Events are scattered across namespaces. Logs explain part of the story, but not the whole story. Developers usually run the same commands again and again before they can even explain the incident clearly.

That is the problem I wanted to solve with this project: an AI Kubernetes Troubleshooting Agent that acts like a first responder for common cluster issues.

The goal was not to replace DevOps or SRE teams. The goal was to reduce the repetitive investigation work, make Kubernetes failures easier for developers to understand, and provide a structured diagnosis with useful commands, confidence, and prevention advice.

In this post, I will walk through the complete build: the project idea, the architecture, the InsForge setup, the backend server, the AI reasoning flow, Docker setup, local Kubernetes testing with kind, and the failure simulations I used to verify the bot.

<video controls width="100%">
  <source src="https://res.cloudinary.com/dvzxfbcsd/video/upload/v1780040031/xspqke1mjgc6idbz1z8d.mp4" type="video/mp4">
</video>

## What We Are Building

The agent is a full-stack application that inspects a Kubernetes cluster and returns an AI-assisted root cause report.

At a high level, the user signs in, selects a kubeconfig context, clicks an investigation button, and waits while the backend gathers evidence from the cluster. The backend checks pods, logs, events, deployments, and networking information. If it finds a critical signal, it sends structured evidence to an LLM through OpenRouter. The result is a diagnosis that includes:

- Root cause
- Beginner-friendly explanation
- Suggested fix
- Safe `kubectl` commands
- Prevention advice
- Confidence score
- Confidence reasoning

The application also stores investigation history in InsForge and streams progress updates through InsForge realtime channels.

![AI Kubernetes Agent dashboard](https://res.cloudinary.com/dvzxfbcsd/image/upload/v1780036605/uyp6q8wtzydp1zvl2np6.png)

## Why This Bot Is Useful

Kubernetes troubleshooting is often repetitive. A developer reports that something is down, then someone checks pod status, describes the pod, reads logs, inspects recent events, checks deployments, and only then starts forming a real hypothesis.

The agent helps with three practical goals.

First, it reduces troubleshooting time. It automates the first investigation pass and collects the evidence that engineers normally gather manually.

Second, it democratizes debugging. Developers can understand common problems like CrashLoopBackOff and ImagePullBackOff without waiting for a DevOps engineer to explain every detail.

Third, it standardizes incident response. Every investigation follows the same process and can be stored in a history table for future review.

At a company level, this kind of tool can reduce low-value escalations, improve visibility across many clusters, and help teams identify repeated failure patterns. It can also support better access control when paired with an authentication layer like InsForge.

![Kubernetes debugging meme](https://res.cloudinary.com/dvzxfbcsd/image/upload/v1780036784/a2lynsumggizye1w8ptg.jpg)

## Architecture Overview

The project has two main services:

- A FastAPI backend that talks to Kubernetes and OpenRouter
- A Next.js frontend that handles the user dashboard

InsForge is used for authentication, investigation history, and realtime progress updates.

The backend uses `kubectl` inside the container. This was a deliberate design choice because it keeps the first version simple. Instead of building a Kubernetes client wrapper for every API, the backend calls familiar `kubectl` commands and parses JSON output.

The flow looks like this:

1. User signs in through the frontend.
2. Frontend gets available kubeconfig contexts from the backend.
3. User selects a context and starts an investigation.
4. Frontend subscribes to an InsForge realtime channel.
5. Backend validates the InsForge session token.
6. Backend validates Kubernetes access.
7. Backend collects pod, log, event, deployment, and network evidence.
8. Backend publishes progress rows to InsForge.
9. InsForge realtime sends progress events to the browser.
10. Backend sends unhealthy evidence to OpenRouter.
11. AI returns a structured diagnosis.
12. Frontend saves the investigation history to InsForge.

![AI Kubernetes Troubleshooting Agent architecture diagram](https://res.cloudinary.com/dvzxfbcsd/image/upload/v1780037246/iepulkhslusnvmrhj9rk.png)

## Prerequisites

Before running this project, you need a few things installed and configured.

You need Docker because the project runs with Docker Compose and kind uses Docker under the hood.

You need a Kubernetes cluster. For local testing, kind is a good option because it creates a Kubernetes cluster inside Docker quickly.

You need an InsForge account. In this project, InsForge provides authentication, PostgreSQL database tables, and realtime updates.

You need an OpenRouter API key. InsForge can help with the model gateway setup, but the backend should call OpenRouter from server-side code only. Never expose the OpenRouter key in the browser.

You also need an AI coding assistant setup if you want to reproduce the workflow exactly. I used Cursor with the InsForge MCP server installed, which made it easier to manage database setup and backend configuration while coding.

## Codebase Structure

The repository is organized into a backend, frontend, documentation, Kubernetes test manifests, and prompts.

The important folders are:

- `backend`: FastAPI application, Kubernetes inspectors, AI reasoning code, and Dockerfile
- `frontend`: Next.js dashboard, InsForge client, auth hooks, realtime progress, and UI components
- `k8s/test-failures`: Kubernetes manifests used to simulate real failures
- `docs`: Setup notes for InsForge and testing scenarios
- `docker-compose.yml`: Local orchestration for backend and frontend

The backend is intentionally modular. The Kubernetes logic is split into files like `pod_inspector.py`, `logs_collector.py`, `events_analyzer.py`, `deployment_inspector.py`, and `network_inspector.py`. The AI logic is split into prompt building, model calling, root cause parsing, confidence handling, and fallback diagnosis.

This separation made the project easier to reason about. It also made testing more natural because each inspector has a clear responsibility.

## InsForge Setup

InsForge handles three important parts of the application.

The first part is authentication. The frontend uses the InsForge TypeScript SDK to sign up, sign in, sign out, and load the current user.

The second part is database storage. The application stores completed investigation history in an `investigations` table.

The third part is realtime progress. The backend inserts progress rows into `investigation_progress`, and a database trigger publishes those updates to a channel such as `investigation:<id>`.

Create an InsForge project, copy the backend URL and anon key, then configure these environment variables:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-project.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
INSFORGE_BASE_URL=https://your-project.region.insforge.app
```

The frontend client is small:

```ts
import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "",
});
```

For the database, create an `investigations` table to store completed diagnosis results. Then create an `investigation_progress` table for live status updates. The progress table should contain fields such as investigation ID, user ID, step, label, status, metadata, and creation time.

For realtime, create a channel pattern:

```text
investigation:%
```

Then add a Postgres trigger that publishes a `progress` event whenever a new progress row is inserted.

![InsForge database and realtime setup](https://res.cloudinary.com/dvzxfbcsd/image/upload/v1780036888/ahqvcz2x3foal1przor3.png)

## Backend Server Setup

The backend is a FastAPI app. It exposes health, cluster listing, and investigation routes.

The most important routes are:

- `GET /health`
- `GET /clusters`
- `POST /investigate`

The `/clusters` endpoint reads kubeconfig contexts so the frontend can let the user choose which cluster to inspect. The `/investigate` endpoint validates the user, validates Kubernetes access, runs the evidence collection pipeline, and calls the AI reasoning layer if critical findings are present.

The investigation pipeline is simple and readable:

```py
def run_investigation(progress_callback=None, context=None):
    pods = inspect_pods(context=context)
    logs = collect_logs(pods.get("problematic_pods", []), context=context)
    events = analyze_events(context=context)
    deployments = inspect_deployments(context=context)
    network = inspect_network(context=context)

    return {
        "pods": pods,
        "logs": logs,
        "events": events,
        "deployments": deployments,
        "network": network,
        "context": context,
    }
```

Each step can publish progress. That progress becomes visible in the frontend while the investigation is still running.

For authentication, the backend expects a bearer token from the frontend. It verifies the session against InsForge before allowing cluster access. This is important because cluster information can be sensitive.

## Kubernetes Evidence Collection

The agent checks several classes of Kubernetes signals.

For pods, it looks for states such as CrashLoopBackOff, ImagePullBackOff, ErrImagePull, Pending, Failed, Error, and OOMKilled. It also handles a stuck ContainerCreating state if a pod has been waiting for too long.

For logs, it collects logs only from problematic pods. This avoids sending unnecessary cluster data to the model.

For events, it looks for useful reasons like FailedScheduling, BackOff, FailedMount, FailedPull, ErrImagePull, and Unhealthy.

For deployments, it checks whether desired replicas and available replicas match.

For networking, it checks service and endpoint signals. This helps detect cases where a service selector does not match any ready pod.

## AI Agent Setup

The AI layer is intentionally constrained. It does not receive a vague prompt like "debug my cluster." Instead, the backend builds a structured evidence object and asks the model to return strict JSON.

The system prompt tells the model to act as a senior Kubernetes SRE, use only the evidence provided, avoid inventing resources, and return a known schema.

The expected output shape includes root cause, explanation, fix, commands, prevention, confidence, and confidence reasoning.

The backend calls OpenRouter from server-side Python code:

```py
payload = {
    "model": model,
    "messages": messages,
    "temperature": 0.1,
    "response_format": {"type": "json_object"},
}
```

Low temperature keeps the answer focused. JSON response format makes the frontend easier to render. The backend also normalizes the response so the UI does not break if the model returns missing fields.

If the AI call fails, the app still returns a fallback diagnosis based on collected Kubernetes evidence. This matters during demos and real incident workflows because rate limits or model errors should not destroy the entire investigation.

## Docker Setup

The backend Docker image uses Python 3.12 slim and installs `kubectl` into the container. That allows the FastAPI service to inspect the selected cluster.

The important part of the backend Dockerfile looks like this:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && curl -fsSLo kubectl "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

CMD ["uvicorn", "app.main:app"]
```

The frontend Docker image builds the Next.js app and starts it on port 3000.

Docker Compose connects the two services. The backend uses host networking so a kind cluster running locally can still be reached through the kubeconfig server address.

```yaml
services:
  backend:
    build:
      context: ./backend
    network_mode: host
    env_file:
      - ./backend/.env
    environment:
      FRONTEND_ORIGIN: http://localhost:3000
      KUBECONFIG_PATH: /root/.kube/config
    volumes:
      - ${KUBECONFIG_HOST_PATH}:/root/.kube/config:ro

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

One important note: the backend container must be able to read your kubeconfig and reach the Kubernetes API server. If your kind cluster runs inside WSL, run Docker Compose from the same WSL environment or mount the correct kubeconfig path.

## Running the Project Locally

Start by creating a local Kubernetes cluster with kind:

```bash
kind create cluster
kubectl get nodes
```

Copy the backend environment example:

```bash
cp backend/.env.example backend/.env
```

Fill in:

```env
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
KUBECONFIG_PATH=/root/.kube/config
INSFORGE_BASE_URL=https://your-project.region.insforge.app
FRONTEND_ORIGIN=http://localhost:3000
```

Copy the frontend environment example:

```bash
cp frontend/.env.example frontend/.env
```

Fill in:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-project.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```

Set the kubeconfig path for Docker Compose:

```bash
export KUBECONFIG_HOST_PATH=$HOME/.kube/config
```

Build and run the application:

```bash
docker compose build
docker compose up
```

Open the frontend:

```text
http://localhost:3000
```

Check the backend health endpoint:

```text
http://localhost:8000/health
```

After signing in, select a Kubernetes context and click Investigate Cluster.

## Testing the Bot

I tested the agent in three stages.

The first stage was initial cluster verification. I ran the agent against a clean kind cluster to make sure the backend, auth flow, kubeconfig access, and AI reasoning path worked together. This also helped confirm that the app could identify standard environment issues, including CoreDNS-related failures if they were present.

The second stage was a CrashLoopBackOff simulation. I deployed a pod that exits with a failure. In one test manifest, a Python container raises an error when `DATABASE_URL` is missing. This forces the pod into a failing state. The agent detected the crash loop, used the logs and pod status as evidence, explained the node and pod state, and suggested remediation steps.

The third stage was an ImagePullBackOff simulation. I deployed an Nginx pod with an invalid image tag. The agent detected the image pull error, identified the root cause as a missing or invalid image, and suggested using a valid image tag.

<video controls width="100%" src="https://res.cloudinary.com/dvzxfbcsd/video/upload/v1780037521/wivmlcpyssv7hirfyasz.mp4"></video>

To run the test scenarios, apply the namespace first:

```bash
kubectl apply -f k8s/test-failures/namespace.yaml
```

Then apply a failure scenario:

```bash
kubectl apply -f k8s/test-failures/crashloop-missing-env.yaml
```

Or:

```bash
kubectl apply -f k8s/test-failures/imagepull-bad-tag.yaml
```

Wait for Kubernetes to update the pod state:

```bash
kubectl get pods -n ai-k8s-agent-test
```

Then run the investigation from the dashboard.

When you are done, clean up:

```bash
kubectl delete namespace ai-k8s-agent-test
```

## What Worked Well

The best design decision was keeping the investigation structured. Instead of sending raw terminal output directly to the model, the backend collects evidence into predictable JSON. That makes the AI response more reliable and easier to validate.

Another useful decision was skipping the LLM call when no critical findings exist. If pods, events, deployments, and networking checks look healthy, the backend returns a healthy-cluster diagnosis immediately. This saves cost, reduces latency, and avoids asking the model to invent problems.

Realtime progress also made the app feel much better. Kubernetes investigations can take a few seconds, and users need to see that work is happening. The progress list shows steps like Checking Pods, Reading Logs, Analyzing Events, Inspecting Deployments, Checking Networking, AI Reasoning, and Root Cause Found.

## What I Would Improve Next

There are several directions I would take next.

First, I would add role-based access control so teams can limit which users can inspect which clusters.

Second, I would add namespace filtering. In larger clusters, users may not want to inspect everything.

Third, I would store raw evidence with retention rules. Investigation history is useful, but cluster data may contain sensitive information.

Fourth, I would add remediation approval workflows. The current version suggests commands, but a future version could prepare fixes and ask for human approval before applying them.

Fifth, I would support multiple clusters more formally. The current context selection works well for local testing, but production setups may need service accounts, cluster registry metadata, and audit logging.

For a quick Kubernetes meme break, I also liked this collection: [Top 20 Kubernetes Memes](https://faun.pub/top-20-kubernetes-memes-b5cb4c5af395).

## Lessons Learned

Building this project reminded me that the hard part of AI agent development is not just calling an LLM. The hard part is deciding what evidence the model should see, what it should never see, and what structure it must return.

For infrastructure agents, context quality matters more than prompt length. A focused payload with pod states, logs, events, deployment health, and networking findings is much better than dumping every possible cluster command into the prompt.

The project also reinforced the value of fallback behavior. If OpenRouter is rate limited or unavailable, the system should still explain what it collected and what the user can do next.

Finally, auth and access control should be part of the design from the beginning. A Kubernetes troubleshooting agent has access to operational details. Even in a demo, it is better to build with the same mindset you would use in a real company environment.

## Conclusion

This AI Kubernetes Troubleshooting Agent is a practical example of combining DevOps automation with AI reasoning. The app uses FastAPI for backend orchestration, Next.js for the dashboard, Docker for local setup, InsForge for auth, database, and realtime updates, and OpenRouter for LLM-based root cause analysis.

The result is a bot that can inspect a cluster, identify common failures, explain them clearly, and suggest useful next steps.

It is not a replacement for experienced engineers. It is a faster first pass, a learning tool for developers, and a foundation for a more complete incident response assistant.

<video controls width="100%">
  <source src="https://res.cloudinary.com/dvzxfbcsd/video/upload/v1780040157/wivflzkzl3rbeq5wdct1.mp4" type="video/mp4">
</video>

## References

- [Project repository](https://github.com/GitNimay/k8n-troubleshooting-agent.git)
- [Reference video](https://youtu.be/makkzw8s__s?si=jnUE3kDI8r1jBzOv)
- [Kubernetes meme collection](https://faun.pub/top-20-kubernetes-memes-b5cb4c5af395)

## Questions For You

- What Kubernetes failure should this agent learn to debug next?
- Would you trust an AI agent only to suggest commands, or should it apply approved fixes too?
- How would you design access control for a troubleshooting agent across multiple teams and clusters?
