# POLAR-NAV AI — Deployment Guide

This guide covers deploying POLAR-NAV AI exactly as it runs locally, with both backend and frontend running together.

---

## Quick Start: Docker Locally

Deploy and test the complete system locally using Docker:

```bash
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

---

## Deployment Options

### Option 0: Instant Public HTTPS URL (Zero Setup, Free)

Start the unified fullstack application and expose it worldwide with full HTTPS and WebSocket support:

```bash
# 1. Build frontend and start backend
cd frontend && npm run build && cd ..
uvicorn src.api.main:app --host 127.0.0.1 --port 8000

# 2. In another terminal, run quick tunnel
cloudflared tunnel --url http://127.0.0.1:8000
```

Provides an instant `https://<random-subdomain>.trycloudflare.com` URL with free SSL, WebSocket streaming, and zero configuration.

### Option 1: Railway (Recommended — Easiest Cloud Host)

Railway auto-detects and deploys from the `railway.json` configuration.

#### Setup:

1. Go to [railway.app](https://railway.app)
2. Sign up and connect your GitHub repository
3. Click "Deploy"
4. Railway automatically reads `railway.json` and deploys

#### Result:
- Full stack deployed (backend + frontend on same domain)
- Auto-redeploy on every push to `main`
- Public URL provided immediately
- Environment variables configurable in dashboard

#### Cost:
- Free tier: $5/month credit
- Typical deployment: ~$2–5/month

---

### Option 2: Fly.io

Fly.io specializes in containerized apps and offers a generous free tier.

#### Setup:

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch --copy-config
fly deploy
```

Fly reads `fly.toml` automatically.

#### Result:
- Full stack deployed globally (multiple regions available)
- Public URL: `https://polar-nav-ai.fly.dev`
- 3 shared-cpu-1x 256MB VMs free per month
- Excellent cold-start performance

#### Cost:
- Free tier: 3 small VMs, sufficient for this prototype
- No credit card required to start

---

### Option 3: Render

Render is GitHub-integrated and beginner-friendly.

#### Setup:

1. Go to [render.com](https://render.com)
2. Connect GitHub repository
3. Click "Create new" → "Web Service"
4. Select this repository
5. Set **Build Command**: `echo "handled by dockerfile"`
6. Set **Start Command**: `/app/start.sh`
7. Click Deploy

#### Result:
- Automatic redeploy on push
- Public URL provided
- `render.yaml` configures all settings

#### Cost:
- Free tier: one web service, auto-pauses after 15 min of inactivity
- Starter plan: $7/month (no spin-down)

---

### Option 4: Docker Hub + Any VPS

For maximum control, push the Docker image to Docker Hub and run on any VPS.

#### Build and push:

```bash
docker build -t yourusername/polar-nav-ai:latest .
docker push yourusername/polar-nav-ai:latest
```

#### On your VPS (Ubuntu/Debian):

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Run the image
docker run -d \
  -p 80:5173 \
  -p 8000:8000 \
  --name polar-nav-ai \
  yourusername/polar-nav-ai:latest
```

Then access at `http://<your-vps-ip>`

---

## What Each Configuration File Does

| File | Purpose | When Used |
| :--- | :--- | :--- |
| `Dockerfile` | Builds the complete application (backend + frontend) | All deployments |
| `docker-compose.yml` | Local testing with Docker | Development |
| `railway.json` | Railway.app deployment settings | Railway |
| `fly.toml` | Fly.io deployment settings | Fly.io |
| `render.yaml` | Render deployment settings | Render |
| `.github/workflows/docker-build.yml` | GitHub Actions CI/CD | Auto-build Docker images |

---

## Architecture: How It Works

The Dockerfile uses **multi-stage builds**:

```
Stage 1: backend-build
  └─ Install Python deps
  └─ Copy Python code

Stage 2: frontend-build  
  └─ Install Node deps
  └─ Build React app (npm run build)

Stage 3: Final Image
  └─ Copy Python environment
  └─ Copy built frontend (static files)
  └─ Start both with one script
```

**Result**: A single Docker image containing:
- FastAPI backend on port `8000`
- Static frontend on port `5173`
- Both accessible at their respective ports or through a reverse proxy

---

## Environment Variables

None are required. The system works with defaults:

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `PYTHONUNBUFFERED` | `1` | Always set (no buffering) |
| `PORT` | `8000` (backend), `5173` (frontend) | Fixed in Dockerfile |

---

## Monitoring & Logs

### Railway
```bash
railway logs
```

### Fly.io
```bash
fly logs
```

### Render
Dashboard → "Logs" tab

### Docker locally
```bash
docker-compose logs -f app
```

---

## Health Checks

All deployments include a health check that queries `/api/v1/health`:

```bash
curl https://<your-domain>/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "data_provenance": { ... }
}
```

---

## Common Issues

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| "Backend offline" in UI | Backend not running | Check logs: `docker-compose logs app` |
| Port 8000 already in use | Previous container still running | `docker-compose down` then retry |
| "Cannot find module" frontend | npm install not run | Dockerfile runs it automatically; rebuild |
| Slow first plan (30s) | Cache warming | Expected behavior, normal after first request |
| Deployment stuck building | Large dependency install | Increase timeout in platform settings |

---

## After Deployment

Once deployed, you'll get a public URL like:

- **Railway**: `https://polar-nav-ai-production.up.railway.app`
- **Fly.io**: `https://polar-nav-ai.fly.dev`
- **Render**: `https://polar-nav-ai.onrender.com`

### Access the system:
- **Bridge Console**: `https://<your-domain>`
- **API Docs**: `https://<your-domain>/docs`
- **Health Check**: `https://<your-domain>/api/v1/health`

---

## Auto-Redeploy on GitHub Push

All platforms listed above support auto-redeploy:

1. Make a change to the repository
2. `git push` to `main`
3. Platform automatically rebuilds and redeploys
4. New URL reflects the latest code within 2–5 minutes

No additional setup needed.

---

## Reverting to Rollback

### Railway
Dashboard → Deployments → Select previous version → Redeploy

### Fly.io
```bash
fly releases
fly rollback <release-number>
```

### Render
Dashboard → Deployments → Select previous → Redeploy

---

## Local Testing Before Deployment

Test the exact Docker build locally:

```bash
# Build
docker-compose build

# Run
docker-compose up

# Test in another terminal
curl http://localhost:8000/api/v1/health
curl http://localhost:5173
```

If it works here, it works on any platform.

---

## Next Steps

1. **Choose a platform**: Railway (easiest) or Fly.io (most reliable)
2. **Connect GitHub**: One click to authorize
3. **Deploy**: Automatic or one-click
4. **Share the URL**: Your prototype is live

**Questions?** Check the platform's documentation or GitHub Issues.

---

**Built for Smart India Hackathon 2026**
