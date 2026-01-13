# 🚀 Deployment - START HERE

## Choose Your Deployment Path

You have **2 options** for deploying your trivia buzzer app:

---

## ⭐ Option 1: Both on Fly.io (RECOMMENDED FOR YOU)

**Single platform, simpler setup**

✅ Best for hobby/personal projects
✅ Everything in one place
✅ Easier to manage

📖 **Follow this guide:**
```
DEPLOYMENT-FLYIO.md
```

**Quick commands:**
```bash
# 1. Deploy backend
cd backend
flyctl launch
flyctl secrets set GM_PASSWORD="your-password"
flyctl deploy

# 2. Deploy frontend
cd ../frontend
flyctl launch
flyctl secrets set NEXT_PUBLIC_WS_URL="https://your-backend.fly.dev"
flyctl deploy
```

---

## 🌟 Option 2: Fly.io (Backend) + Vercel (Frontend)

**Best performance, global CDN**

✅ Best for production/high traffic
✅ Optimized Next.js hosting
✅ Global edge caching

📖 **Follow this guide:**
```
DEPLOYMENT.md
```

**Quick commands:**
```bash
# 1. Deploy backend (Fly.io)
cd backend
flyctl launch && flyctl deploy

# 2. Deploy frontend (Vercel)
cd ../frontend
vercel --prod
```

---

## 🤔 Not Sure Which to Choose?

Read the comparison:
```
DEPLOYMENT-COMPARISON.md
```

**TL;DR:** If this is your first deployment or hobby project → **Choose Option 1**

---

## 📋 Deployment Scripts Available

After initial setup, use these for quick updates:

```bash
# Update backend
./deploy-backend.sh

# Update frontend (if using Fly.io)
./deploy-frontend.sh
```

---

## 🆘 Need Help?

All guides include:
- ✅ Step-by-step instructions
- ✅ Troubleshooting section
- ✅ Environment variable setup
- ✅ Cost estimates

**Choose a guide above and get started!** 🎉
