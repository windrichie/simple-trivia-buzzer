# Deployment Guide

Complete deployment documentation for the Trivia Buzzer App.

---

## 📋 Available Deployment Options

### 1. Fly.io (Both Frontend & Backend)
**Recommended for most users** - Simple, single-platform deployment.

📖 **[Fly.io Deployment Guide](./docs/FLY-IO-DEPLOYMENT.md)**

**Quick Start:**
```bash
# Backend
cd backend
flyctl launch
flyctl secrets set GM_PASSWORD="your-password"
flyctl secrets set FRONTEND_URL="https://trivia-buzzer-frontend.fly.dev"
flyctl deploy

# Frontend
cd ../frontend
flyctl launch
flyctl deploy
```

---

### 2. Cloud VM (AWS EC2, BytePlus ECS, etc.)
**For custom infrastructure** - Deploy both apps on a single Ubuntu VM.

📖 **[VM Deployment Guide](./docs/VM-DEPLOYMENT.md)**

Features:
- Both frontend and backend on same machine
- Nginx reverse proxy
- SSL/TLS with Let's Encrypt
- PM2 process management
- Comprehensive setup guide

---

## 🔧 Environment Variables

All deployment methods require these environment variables:

### Backend
```bash
GM_PASSWORD=your-secure-password      # Required: Game Master password
FRONTEND_URL=https://your-frontend-url # Required: For CORS in production
NODE_ENV=production                    # Set automatically in most cases
PORT=3001                              # Optional: defaults to 3001
```

### Frontend
```bash
NEXT_PUBLIC_WS_URL=https://your-backend-url  # Required: WebSocket backend URL
```

---

## 📚 Additional Resources

- **[Architecture & Development Guide](./CLAUDE.md)** - Complete technical documentation
- **[Project README](./README.md)** - Overview and getting started
- **[Sound System Documentation](./SOUND_SYSTEM.md)** - Buzzer audio features

---

## 🆘 Need Help?

Each deployment guide includes:
- ✅ Step-by-step instructions
- ✅ Troubleshooting section
- ✅ Security best practices
- ✅ Monitoring & maintenance

Choose a guide above and follow the instructions!
