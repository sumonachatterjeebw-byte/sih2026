# POLAR-NAV AI — Deployment Guide

This guide describes how to deploy the POLAR-NAV AI decision-support prototype (Smart India Hackathon 2026, Problem Statement 26059) to a public URL that anyone can access.

---

## Why the backend cannot run on Vercel

The backend cannot run on Vercel Serverless Functions. This was investigated and directly measured:

| Blocker | Measurement / Fact |
| :--- | :--- |
| **Serverless bundle size limit (250 MB)** | The backend Python dependencies total **262 MB** uncompressed. SciPy alone accounts for 121 MB. |
| **No WebSocket support** | The live voyage telemetry stream requires a persistent WebSocket connection (`/api/v1/ws/voyage/{id}`). Vercel Serverless Functions do not support WebSockets. |
| **Stateless between invocations** | Active voyage simulation engines are maintained in process memory. On serverless infrastructure, successive requests (`/step`, status queries) land on cold worker instances that have no record of the voyage. |
| **Execution duration & cold starts** | Computing a dual-route A* optimisation takes approximately 32 seconds on CPU against serverless timeouts, paid cold on every request. |

The frontend bundle *can* be hosted on Vercel if split deployment is desired (see [Split Deployment](#split-deployment-optional) below).

---

## Recommended Deployment: Render (via Blueprint)

Render is the recommended deployment platform. It runs Docker containers, maintains persistent processes in memory, supports WebSockets, and offers a free tier.

### 1-Click Setup via Blueprint

1. Sign in to [Render](https://render.com) using GitHub.
2. Click **New +** &rarr; **Blueprint**.
3. Connect the `sumonachatterjeebw-byte/sih2026` repository.
4. Render automatically detects `render.yaml` at the root and configures the service.
5. Click **Apply**. The first build takes approximately 4–5 minutes.
6. Render will assign a public HTTPS URL (e.g. `https://polar-nav-ai.onrender.com`).

### Free-Tier Realities

When running on Render's free tier, keep the following operational characteristics in mind:
- **Idle sleep**: The service spins down after approximately 15 minutes of inactivity.
- **Wake time**: Waking up from cold sleep takes approximately 50 seconds. For demonstrations or reviews, open the URL 1–2 minutes beforehand.
- **Resources**: 512 MB RAM and shared CPU.
- **Single worker**: Uvicorn runs with `--workers 1` because voyage state is held in process memory.
- **Ephemeral disk**: SQLite data at `/app/data` is wiped on each redeploy or instance restart. This is fine for demonstrations; attach a persistent disk if historical voyages must be retained.

---

## Running with Docker on Any Host

You can deploy the container to any VPS, cloud VM, or container service (AWS ECS, GCP Cloud Run, DigitalOcean, Fly.io, etc.):

```bash
# Build the single image (contains built frontend + FastAPI backend)
docker build -t polar-nav .

# Run the container
docker run -p 8000:8000 polar-nav
```

Then visit `http://localhost:8000` (or `http://<your-server-ip>:8000`).

### Host Requirements:
- Minimum **512 MB RAM** (1 GB recommended).
- HTTP request timeout configured to **> 60 seconds** to accommodate 32-second route optimisation.
- Support for **WebSocket connections** on `/api/v1/ws/*`.

---

## Split Deployment (Optional)

If the frontend and backend must be hosted on separate domains (e.g. frontend on Vercel, backend on Render):

1. Set `VITE_API_BASE_URL` to your backend origin (e.g. `https://polar-nav-api.onrender.com`) **at build time**.
2. Run `npm run build` inside `frontend/`.
3. Deploy the `frontend/dist` directory to your static host (e.g. using `frontend/vercel.json`).

> [!WARNING]
> `VITE_API_BASE_URL` is baked into the JavaScript bundle at build time by Vite. Setting or updating this environment variable in a hosting dashboard without triggering a full rebuild will have no effect.

---

## Known Limits & Architectural Constraints

- **Route planning duration**: Optimising a full Antarctic passage computes two complete physics-driven routes (ice-blind baseline and POLARIS-constrained) and takes ~32 seconds on a typical CPU.
- **Single worker process**: The server runs with a single Uvicorn worker. Voyage simulation state is held in memory; multiple workers would fail to locate active voyages across requests until state is moved to Redis.
- **Ephemeral persistence**: Local SQLite files (`data/polarnav.db`) are stored in the container filesystem.
- **Authentication & Rate Limiting**: The prototype has no authentication or rate limiting enabled.
- **Memory retention**: In-memory voyage simulation engines are not automatically evicted.
