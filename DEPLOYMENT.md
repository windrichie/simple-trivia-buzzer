# 🚀 Trivia Buzzer App - Deployment Guide

## Prerequisites

1. **Install Fly.io CLI**
   ```bash
   # macOS
   brew install flyctl

   # Or use curl
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign up for Fly.io**
   ```bash
   flyctl auth signup
   # Or login if you have an account
   flyctl auth login
   ```

3. **Install Vercel CLI** (for frontend)
   ```bash
   npm install -g vercel
   ```

---

## 🔧 Backend Deployment (Fly.io)

### Step 1: Build Backend

```bash
cd backend
npm run build
```

### Step 2: Launch Fly.io App

```bash
# Create and deploy the app
flyctl launch

# When prompted:
# - App name: Press enter to accept "trivia-buzzer-backend" or choose your own
# - Region: Choose closest to your users (e.g., sin for Singapore)
# - PostgreSQL: NO (we use in-memory storage)
# - Redis: NO (not needed)
# - Deploy now: NO (we need to set secrets first)
```

### Step 3: Set Environment Variables

```bash
# Set your Game Master password
flyctl secrets set GM_PASSWORD="your-secret-password-here"
```

### Step 4: Deploy

```bash
flyctl deploy
```

### Step 5: Verify Deployment

```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Get your backend URL
flyctl info
# Look for "Hostname" - it will be something like: trivia-buzzer-backend.fly.dev
```

### Step 6: Test Backend

Visit: `https://your-app-name.fly.dev/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

---

## 🎨 Frontend Deployment (Vercel - Recommended)

### Why Vercel?
- Optimized for Next.js
- Free tier with great performance
- Automatic HTTPS
- Easy deployment

### Step 1: Update Frontend Configuration

Edit `frontend/lib/socket.ts` and update the backend URL:

```typescript
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://your-app-name.fly.dev';
```

### Step 2: Deploy to Vercel

```bash
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel

# When prompted:
# - Set up and deploy: Y
# - Project name: Press enter or choose a name
# - Directory: ./
# - Override settings: N

# Set environment variable
vercel env add NEXT_PUBLIC_SOCKET_URL
# Enter: https://your-backend-app.fly.dev

# Deploy to production
vercel --prod
```

---

## 🔐 Security Checklist

- [x] GM_PASSWORD set as secret (not in code)
- [x] CORS configured to allow only your frontend domain
- [x] HTTPS enforced on both frontend and backend
- [x] Health check endpoint configured
- [ ] Update CORS origins in `backend/src/server.ts`:

```typescript
// backend/src/server.ts
const allowedOrigins = [
  'https://your-frontend-domain.vercel.app',
  'http://localhost:3000', // Remove in production
];
```

---

## 📊 Monitoring & Maintenance

### View Backend Logs
```bash
flyctl logs
```

### Scale Backend
```bash
# Add more instances
flyctl scale count 2

# Change VM size
flyctl scale vm shared-cpu-2x
```

### Update Backend
```bash
cd backend
npm run build
flyctl deploy
```

### Update Frontend
```bash
cd frontend
vercel --prod
```

---

## 🌐 Custom Domain (Optional)

### Backend (Fly.io)
```bash
flyctl certs add your-api-domain.com
```

### Frontend (Vercel)
1. Go to Vercel dashboard
2. Project Settings → Domains
3. Add your domain and follow DNS instructions

---

## 🐛 Troubleshooting

### Backend not connecting
1. Check logs: `flyctl logs`
2. Verify GM_PASSWORD is set: `flyctl secrets list`
3. Test health endpoint: `curl https://your-app.fly.dev/health`

### WebSocket connection issues
1. Ensure CORS origins include your frontend URL
2. Check that `force_https = true` is in fly.toml
3. Verify WebSocket URL in frontend matches backend URL

### Frontend build fails
1. Check Node version: `node --version` (should be 22+)
2. Clear cache: `rm -rf .next node_modules && npm install`
3. Check environment variables: `vercel env ls`

---

## 💰 Cost Estimate

### Fly.io (Backend)
- **Free tier**: 3 shared VMs (256MB RAM)
- **Paid**: ~$5-10/month for 512MB VM with auto-scaling

### Vercel (Frontend)
- **Free tier**: Unlimited bandwidth, 100GB/month
- **Pro**: $20/month (if you need more)

### Total: **$0-10/month** for hobby projects

---

## 🎯 Production Checklist

Before going live:

- [ ] Backend deployed to Fly.io
- [ ] Frontend deployed to Vercel
- [ ] GM_PASSWORD secret set
- [ ] CORS configured with production frontend URL
- [ ] Health checks passing
- [ ] Test full game flow (create session → players join → buzzer → scoring)
- [ ] Test on mobile devices
- [ ] Test reconnection scenarios
- [ ] Remove development CORS origins
- [ ] Set up monitoring/alerts (optional)

---

## 📝 Environment Variables Summary

### Backend (Fly.io Secrets)
```
GM_PASSWORD=your-secure-password
PORT=3001 (already set in fly.toml)
```

### Frontend (Vercel Environment Variables)
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-app.fly.dev
```

---

## 🆘 Support

- **Fly.io Docs**: https://fly.io/docs/
- **Vercel Docs**: https://vercel.com/docs
- **Issues**: Check application logs first

Happy hosting! 🎉
