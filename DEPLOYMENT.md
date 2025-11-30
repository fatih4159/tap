# Deployment Guide - EasyPanel

This guide explains how to deploy the TAP POS System to EasyPanel or any similar Docker/Supervisord-based hosting platform.

## Overview

The TAP POS System consists of:
- **Backend** (Node.js/Express) - Port 3000
- **Frontend** (React/Vite) - Port 5173

## Quick Deployment

### Option 1: Using Supervisord (Recommended for EasyPanel)

1. **Deploy your code to `/code` directory**
   ```bash
   # Your code should be in /code/backend and /code/frontend
   ```

2. **Run the deployment start script**
   ```bash
   cd /code
   ./deploy-start.sh
   ```

3. **Verify services are running**
   ```bash
   supervisorctl status
   ```

### Option 2: Manual Supervisord Setup

1. **Copy supervisord configuration**
   ```bash
   cp /code/supervisord.conf /etc/supervisor/conf.d/tap-pos.conf
   ```

2. **Update supervisord**
   ```bash
   supervisorctl reread
   supervisorctl update
   ```

3. **Start services**
   ```bash
   supervisorctl start backend
   supervisorctl start frontend
   ```

## File Structure

```
/code/
├── backend/
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── node_modules/
├── frontend/
│   ├── src/
│   ├── dist/           # Built production files
│   ├── package.json
│   └── node_modules/
├── logs/
│   ├── backend.log
│   ├── frontend.log
│   ├── backend-error.log
│   └── frontend-error.log
├── supervisord.conf    # Supervisord configuration
└── deploy-start.sh     # Deployment startup script
```

## Configuration Files

### supervisord.conf

Located at the root of the project. This file configures how Supervisord manages the backend and frontend processes.

Key settings:
- **Backend**: Runs `npm start` in `/code/backend`
- **Frontend**: Runs `npm run preview` in `/code/frontend` on port 5173
- **Logs**: Stored in `/code/logs/`

### Environment Variables

Create or update `/code/backend/.env` with your production settings:

```env
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=tap_pos_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Secret
JWT_SECRET=your-secure-jwt-secret-here

# Server
PORT=3000
NODE_ENV=production

# Stripe (if using payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## Deployment Steps for EasyPanel

### Initial Setup

1. **Create a new app in EasyPanel**
   - Choose "Node.js" as the app type
   - Set the build directory to `/`

2. **Configure build commands**
   ```bash
   # Install backend dependencies
   cd backend && npm ci --production
   
   # Install frontend dependencies and build
   cd ../frontend && npm ci && npm run build
   ```

3. **Configure start command**
   ```bash
   ./deploy-start.sh
   ```

4. **Set environment variables in EasyPanel**
   - Add all required environment variables from `.env.example`

### Using the Deployment Script

The `deploy-start.sh` script handles:
- ✅ Dependency installation (if needed)
- ✅ Frontend production build
- ✅ Environment configuration check
- ✅ Log directory creation
- ✅ Service startup with Supervisord
- ✅ Health checks

### Managing Services

**View status:**
```bash
supervisorctl status
```

**Restart services:**
```bash
supervisorctl restart backend
supervisorctl restart frontend
# Or restart all:
supervisorctl restart all
```

**View logs:**
```bash
# Backend logs
tail -f /code/logs/backend.log

# Frontend logs
tail -f /code/logs/frontend.log

# Error logs
tail -f /code/logs/backend-error.log
tail -f /code/logs/frontend-error.log
```

**Stop services:**
```bash
supervisorctl stop backend
supervisorctl stop frontend
```

## Troubleshooting

### Issue: "npm error ENOENT: no such file or directory, open '/code/package.json'"

**Cause:** The system is looking for a package.json at the root level, but the project has separate backend/frontend directories.

**Solution:** Make sure you're using the correct supervisord configuration that points to `/code/backend` and `/code/frontend`.

```bash
# Verify configuration
cat /code/supervisord.conf

# Should show:
# [program:backend]
# directory=/code/backend
# [program:frontend]
# directory=/code/frontend
```

### Issue: Services keep restarting

**Check logs:**
```bash
tail -f /code/logs/backend.log
tail -f /code/logs/frontend.log
```

**Common causes:**
- Missing environment variables
- Database connection issues
- Port conflicts

### Issue: Frontend build fails

```bash
cd /code/frontend
npm install
npm run build
```

### Issue: Backend won't start

1. **Check database connection:**
   ```bash
   # Verify DB_HOST, DB_PORT, DB_NAME in .env
   cat /code/backend/.env
   ```

2. **Test database connectivity:**
   ```bash
   cd /code/backend
   node -e "require('./src/database/connection.js')"
   ```

3. **Run migrations:**
   ```bash
   cd /code/backend
   npm run migrate
   ```

## Health Checks

### Backend Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-30T20:00:00.000Z"
}
```

### Frontend Check
```bash
curl -I http://localhost:5173
```

Expected: HTTP 200 OK

## Port Configuration

Default ports:
- **Backend:** 3000
- **Frontend:** 5173

To change ports:

1. **Backend:** Update `PORT` in `/code/backend/.env`
2. **Frontend:** Update the start command in `supervisord.conf`:
   ```ini
   command=npm run preview -- --host 0.0.0.0 --port YOUR_PORT
   ```

## Database Migrations

Run migrations during deployment:

```bash
cd /code/backend
npm run migrate
```

Or set the environment variable before running the deploy script:
```bash
export RUN_MIGRATIONS=true
./deploy-start.sh
```

## Performance Tips

1. **Use production builds:**
   - Frontend: Always build with `npm run build` before deployment
   - Backend: Set `NODE_ENV=production`

2. **Enable compression:**
   - The backend already includes compression middleware

3. **Monitor logs:**
   - Regularly check logs for errors
   - Set up log rotation (already configured in supervisord)

4. **Database optimization:**
   - Use connection pooling (already configured)
   - Add indexes for frequently queried fields

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS (configure in EasyPanel)
- [ ] Set secure environment variables
- [ ] Regularly update dependencies
- [ ] Monitor access logs

## Rollback

If something goes wrong:

```bash
# Stop services
supervisorctl stop all

# Restore previous code version
# (depends on your deployment method)

# Restart services
supervisorctl start all
```

## Support

For issues:
1. Check logs: `/code/logs/`
2. Verify configuration: `/code/supervisord.conf`
3. Check environment variables: `/code/backend/.env`
4. Review this deployment guide

## Common Commands Reference

```bash
# Status
supervisorctl status

# Restart
supervisorctl restart backend
supervisorctl restart frontend

# Logs
tail -f /code/logs/backend.log
tail -f /code/logs/frontend.log

# Stop
supervisorctl stop all

# Start
supervisorctl start all

# Reload config
supervisorctl reread
supervisorctl update
```

## Next Steps

After successful deployment:

1. ✅ Test all features
2. ✅ Run database migrations
3. ✅ Create admin user
4. ✅ Configure payment gateway (if applicable)
5. ✅ Set up monitoring
6. ✅ Configure backups

---

**Last Updated:** November 30, 2025
