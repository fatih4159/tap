# 🚀 TAP POS - Quick Reference

## Starting & Stopping Services

### Start Services
```bash
./start.sh
```
Starts backend (port 3000) and frontend (port 5173) in background.

### Stop Services
```bash
./stop.sh
```
Gracefully stops all services and ensures ports are freed.

### Check Status
```bash
# Check if services are running
lsof -i:3000  # Backend
lsof -i:5173  # Frontend

# Check logs
tail -f logs/backend.log
tail -f logs/frontend.log
```

## Troubleshooting Port Issues

### Issue: "Port 3000 is already in use"

**Quick Fix:**
```bash
./cleanup-ports.sh
./start.sh
```

**Manual Fix:**
```bash
# Find process using port 3000
lsof -i:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Or kill by PID
kill -9 <PID>
```

### Issue: Stop script says "stopped" but port still in use

This has been **fixed** in the enhanced stop script. The script now:
- ✅ Kills entire process groups (parent + children)
- ✅ Verifies ports are free after shutdown
- ✅ Force kills any remaining processes on the ports

If you still encounter this, run:
```bash
./cleanup-ports.sh
```

## Common Commands

### Development
```bash
# Initialize project (first time only)
./init.sh

# Start services
./start.sh

# View logs
tail -f logs/backend.log
tail -f logs/frontend.log

# Stop services
./stop.sh
```

### Database
```bash
cd backend
npm run migrate  # Run migrations
npm run seed     # Seed database (if available)
```

### Testing
```bash
# Test backend health
curl http://localhost:3000/health

# Test with browser
open http://localhost:5173
```

## Script Overview

| Script | Purpose |
|--------|---------|
| `init.sh` | Initial setup - installs dependencies, creates .env |
| `start.sh` | Start both backend and frontend services |
| `stop.sh` | Stop all services and free ports |
| `cleanup-ports.sh` | Emergency port cleanup utility |

## Service URLs

- 🖥️  **Frontend**: http://localhost:5173
- ⚡ **Backend API**: http://localhost:3000
- 💚 **Health Check**: http://localhost:3000/health

## Log Files

- 📄 Backend: `logs/backend.log`
- 📄 Frontend: `logs/frontend.log`

## PID Files (Internal)

- `.backend.pid` - Backend process ID
- `.frontend.pid` - Frontend process ID

*Note: These are managed automatically by the scripts*

## Need Help?

- 📖 Detailed documentation: `PORT_FIX_DOCUMENTATION.md`
- 📝 Fix summary: `FIX_SUMMARY.md`
- 📘 Main README: `README.md`

## Emergency Recovery

If everything goes wrong:

```bash
# 1. Kill all node processes (nuclear option)
pkill -9 node

# 2. Clean up ports
./cleanup-ports.sh

# 3. Remove PID files
rm -f .backend.pid .frontend.pid

# 4. Start fresh
./start.sh
```

## Tips

💡 **Always use the scripts** instead of manual npm commands to ensure proper process tracking.

💡 **Check logs first** when services fail to start - they contain valuable error information.

💡 **Run cleanup-ports.sh** if you ever see "port already in use" errors.

💡 **Wait a few seconds** between stop and start to allow ports to fully release.
