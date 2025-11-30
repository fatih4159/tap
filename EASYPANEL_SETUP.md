# EasyPanel Deployment - Quick Setup

## The Problem (Fixed)
Your EasyPanel deployment was failing because supervisord was looking for `/code/package.json`, but your project structure has separate `backend/` and `frontend/` directories.

## The Solution
Three new files have been created to properly deploy your TAP POS System on EasyPanel:

### 1. supervisord.conf
Configuration file that tells supervisord how to run your backend and frontend services.

**Key features:**
- Runs backend from `/code/backend` directory
- Runs frontend from `/code/frontend` directory  
- Manages logs in `/code/logs/`
- Auto-restarts services if they crash
- Frontend runs in production preview mode

### 2. deploy-start.sh
Automated deployment script that handles the entire setup process.

**What it does:**
- ✅ Detects deployment directory (/code or /workspace)
- ✅ Installs dependencies if missing
- ✅ Builds frontend for production
- ✅ Checks environment configuration
- ✅ Creates log directories
- ✅ Starts services with supervisord
- ✅ Performs health checks

### 3. DEPLOYMENT.md
Complete deployment documentation with troubleshooting guide.

## How to Deploy on EasyPanel

### Step 1: Push your code
Make sure all files are committed and pushed to your repository:
```bash
git add .
git commit -m "Add EasyPanel deployment configuration"
git push
```

### Step 2: Deploy to EasyPanel
When your code is deployed to `/code` on EasyPanel, run:
```bash
cd /code
chmod +x deploy-start.sh
./deploy-start.sh
```

### Step 3: Verify services
```bash
supervisorctl status
```

You should see:
```
backend                          RUNNING   pid 123, uptime 0:00:30
frontend                         RUNNING   pid 124, uptime 0:00:30
```

## Alternative: Using the supervisord.conf directly

If you prefer to use EasyPanel's built-in supervisord configuration:

1. Copy the supervisord.conf to the EasyPanel supervisor directory:
```bash
cp /code/supervisord.conf /etc/supervisor/conf.d/tap-pos.conf
```

2. Reload supervisor:
```bash
supervisorctl reread
supervisorctl update
```

3. Start services:
```bash
supervisorctl start backend
supervisorctl start frontend
```

## Managing Your Deployment

### View logs
```bash
# Backend
tail -f /code/logs/backend.log

# Frontend  
tail -f /code/logs/frontend.log
```

### Restart services
```bash
# Restart backend only
supervisorctl restart backend

# Restart frontend only
supervisorctl restart frontend

# Restart both
supervisorctl restart all
```

### Check status
```bash
supervisorctl status
```

## Environment Variables

Make sure these are set in `/code/backend/.env`:

```env
# Database
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=tap_pos_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_SECRET=your-secure-secret-key-here

# Server
PORT=3000
NODE_ENV=production

# Optional: Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Troubleshooting

### Services won't start
```bash
# Check logs
tail -f /code/logs/backend.log
tail -f /code/logs/frontend.log

# Check supervisor logs
tail -f /code/logs/supervisord.log
```

### Port conflicts
```bash
# Check what's using ports
lsof -ti:3000
lsof -ti:5173

# Kill conflicting processes
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Frontend not building
```bash
cd /code/frontend
npm install
npm run build
```

### Database connection issues
```bash
# Verify .env file
cat /code/backend/.env

# Test database connection
cd /code/backend
node -e "require('./src/database/connection.js')"
```

## Files Created

```
/workspace/
├── supervisord.conf          # Supervisord configuration
├── deploy-start.sh           # Deployment startup script
└── DEPLOYMENT.md             # Complete deployment guide
```

## Next Steps

1. ✅ Push these files to your repository
2. ✅ Deploy to EasyPanel
3. ✅ Run `./deploy-start.sh` in the `/code` directory
4. ✅ Verify services are running with `supervisorctl status`
5. ✅ Access your app at your EasyPanel URL

## Support

For detailed instructions, see `DEPLOYMENT.md`.

For issues, check:
1. Logs: `/code/logs/`
2. Supervisor status: `supervisorctl status`
3. Environment variables: `/code/backend/.env`

---

**Created:** November 30, 2025
