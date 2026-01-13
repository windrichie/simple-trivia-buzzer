# 🚀 Deploy BOTH Backend & Frontend to Fly.io

This guide shows you how to deploy **everything to Fly.io** (single platform).

---

## Prerequisites

```bash
# Install Fly.io CLI
brew install flyctl

# Login
flyctl auth login
```

---

## 📦 Step 1: Deploy Backend

### 1.1 Build Backend
```bash
cd backend
npm run build
```

### 1.2 Launch Backend App
```bash
flyctl launch

# When prompted:
# - App name: trivia-buzzer-backend (or your choice)
# - Region: sin (Singapore) or your preferred region
# - PostgreSQL: NO
# - Redis: NO
# - Deploy now: NO (we'll set secrets first)
```

### 1.3 Set Backend Secrets
```bash
flyctl secrets set GM_PASSWORD="your-secure-password-here"
```

### 1.4 Deploy Backend
```bash
flyctl deploy
```

### 1.5 Get Backend URL
```bash
flyctl info

# Note the "Hostname" - something like:
# trivia-buzzer-backend.fly.dev
```

---

## 🎨 Step 2: Deploy Frontend

### 2.1 Launch Frontend App
```bash
cd ../frontend
flyctl launch

# When prompted:
# - App name: trivia-buzzer-frontend (or your choice)
# - Region: sin (SAME as backend for best performance)
# - PostgreSQL: NO
# - Redis: NO
# - Deploy now: NO (we'll set env vars first)
```

### 2.2 Set Frontend Environment Variable
```bash
# Use the backend URL from step 1.5
flyctl secrets set NEXT_PUBLIC_WS_URL="https://trivia-buzzer-backend.fly.dev"
```

### 2.3 Deploy Frontend
```bash
flyctl deploy
```

### 2.4 Get Frontend URL
```bash
flyctl info

# Note the "Hostname" - something like:
# trivia-buzzer-frontend.fly.dev
```

---

## ✅ Verification

### Test Backend
```bash
curl https://trivia-buzzer-backend.fly.dev/health
```

Expected response:
```json
{"status":"ok","timestamp":1234567890}
```

### Test Frontend
Visit `https://trivia-buzzer-frontend.fly.dev` in your browser.

---

## 🔐 Update CORS (Important!)

Edit `backend/src/server.ts` to allow your frontend domain:

```typescript
const allowedOrigins = [
  'https://trivia-buzzer-frontend.fly.dev', // Your frontend URL
  // Remove localhost in production
];
```

Then redeploy backend:
```bash
cd backend
flyctl deploy
```

---

## 🎯 Quick Deploy Scripts

After initial setup, use these scripts for updates:

### Update Backend
```bash
./deploy-backend.sh
```

### Update Frontend
```bash
./deploy-frontend.sh
```

---

## 📊 Managing Your Apps

### View Both Apps
```bash
flyctl apps list
```

### Switch Between Apps
```bash
# Work with backend
cd backend
flyctl status

# Work with frontend
cd ../frontend
flyctl status
```

### View Logs
```bash
# Backend logs
cd backend
flyctl logs

# Frontend logs
cd ../frontend
flyctl logs
```

### Scale Apps
```bash
# Scale backend (if needed)
cd backend
flyctl scale count 2

# Scale frontend (if needed)
cd ../frontend
flyctl scale count 2
```

---

## 💰 Cost Estimate (Fly.io Only)

| Component | Free Tier | Paid (if needed) |
|-----------|-----------|------------------|
| Backend | 3 shared VMs (256MB) | ~$5-10/month |
| Frontend | 3 shared VMs (256MB) | ~$5-10/month |
| **Total** | **$0** (within free tier) | **$10-20/month** |

**Note:** Free tier is generous enough for hobby projects!

---

## 🔄 Environment Variables Summary

### Backend (`cd backend`)
```bash
flyctl secrets list
# Should show:
# - GM_PASSWORD
# - PORT (auto-set in fly.toml)
```

### Frontend (`cd frontend`)
```bash
flyctl secrets list
# Should show:
# - NEXT_PUBLIC_WS_URL
# - PORT (auto-set in fly.toml)
```

---

## 🆘 Troubleshooting

### Backend not responding
```bash
cd backend
flyctl logs
flyctl status
```

### Frontend can't connect to backend
1. Check `NEXT_PUBLIC_WS_URL` is correct:
   ```bash
   cd frontend
   flyctl secrets list
   ```
2. Verify CORS allows your frontend domain
3. Check backend logs for connection errors

### WebSocket not working
1. Ensure backend URL uses `https://` (not `http://`)
2. Check backend logs: `cd backend && flyctl logs`
3. Verify both apps are in the same region for best performance

---

## 🎊 You're Done!

Your trivia buzzer app is now fully deployed on Fly.io!

- **Backend**: `https://trivia-buzzer-backend.fly.dev`
- **Frontend**: `https://trivia-buzzer-frontend.fly.dev`

Share the frontend URL with your players and enjoy! 🎉
