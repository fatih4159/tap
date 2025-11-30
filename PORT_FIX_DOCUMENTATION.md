# Port 3000 Issue - Fix Documentation

## Problem Description

When using the `stop.sh` script to stop the backend, the script reported that the backend stopped, but when trying to start it again, port 3000 was still in use.

## Root Cause

The issue occurred because:

1. **Process Hierarchy**: When `npm start` is executed, it creates a parent npm process that spawns a child node process.
2. **Incomplete Process Termination**: The stop script was only killing the npm parent process (stored in the PID file), but the child node process continued running and holding onto port 3000.
3. **Orphaned Processes**: After killing the npm parent, the node child process became orphaned but remained active, keeping the port occupied.

## Solution Implemented

### 1. Enhanced Process Group Termination

The stop script now kills the **entire process group** instead of just the parent process:

```bash
# Get the process group ID
PGID=$(ps -o pgid= "$BACKEND_PID" | tr -d ' ')

# Kill the entire process group (parent and all children)
kill -- -"$PGID" 2>/dev/null || kill "$BACKEND_PID" 2>/dev/null
```

This ensures that when we kill the npm process, all its child processes (including node) are also terminated.

### 2. Improved Port Cleanup

Enhanced the port cleanup section to:
- Check for **multiple processes** on the same port (not just one)
- Provide better feedback about what processes are being killed
- Verify ports are free after cleanup

```bash
BACKEND_PORT_PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$BACKEND_PORT_PIDS" ]; then
    for PID in $BACKEND_PORT_PIDS; do
        kill -9 "$PID" 2>/dev/null || true
    done
fi
```

### 3. Port Check Before Starting

Added port availability checks in `start.sh` to prevent starting services when ports are already in use:

```bash
if lsof -ti:3000 &> /dev/null; then
    print_error "Port 3000 is already in use!"
    print_info "Or run: ./stop.sh to clean up"
    return 1
fi
```

## Files Modified

### 1. `/workspace/stop.sh`
- **Lines 55-100**: Enhanced backend stop logic with process group termination
- **Lines 102-147**: Enhanced frontend stop logic with process group termination  
- **Lines 149-181**: Improved port cleanup to handle multiple processes per port

### 2. `/workspace/start.sh`
- **Lines 60-101**: Added port availability checks before starting services

### 3. `/workspace/cleanup-ports.sh` (New File)
- Emergency port cleanup utility for troubleshooting

## How to Use

### Normal Operation

1. **Start services:**
   ```bash
   ./start.sh
   ```

2. **Stop services:**
   ```bash
   ./stop.sh
   ```

The stop script will now:
- Kill the entire process group (npm + node processes)
- Check ports 3000 and 5173 for any remaining processes
- Force kill any processes still using those ports
- Verify ports are free before completing

### Troubleshooting

If you still encounter port issues, use the cleanup script:

```bash
./cleanup-ports.sh
```

This will forcefully:
- Remove stale PID files
- Kill all processes on ports 3000 and 5173
- Verify ports are free

### Manual Port Cleanup

If needed, you can manually check and kill processes:

```bash
# Check what's using port 3000
lsof -i:3000

# Kill all processes on port 3000
lsof -ti:3000 | xargs kill -9

# Check what's using port 5173
lsof -i:5173

# Kill all processes on port 5173
lsof -ti:5173 | xargs kill -9
```

## Testing the Fix

To verify the fix works:

1. Start the backend:
   ```bash
   ./start.sh
   ```

2. Verify it's running:
   ```bash
   lsof -i:3000
   curl http://localhost:3000/health
   ```

3. Stop the backend:
   ```bash
   ./stop.sh
   ```

4. Verify the port is free:
   ```bash
   lsof -i:3000
   # Should show nothing
   ```

5. Start again (should work without errors):
   ```bash
   ./start.sh
   ```

## Technical Details

### Process Groups in Unix

When a process spawns child processes, they typically belong to the same **process group**. By using negative PID in the kill command (`kill -9 -- -PGID`), we signal the entire process group, ensuring all related processes are terminated.

### Why This Matters

- **npm/node relationship**: `npm start` spawns node as a child process
- **Port binding**: The child node process binds to port 3000, not npm
- **Orphaning**: Killing only npm leaves node running as an orphan
- **Process group kill**: Killing the process group terminates both npm and node

### Fallback Mechanisms

The fix includes multiple layers of protection:

1. **Primary**: Kill process group (catches parent + children)
2. **Secondary**: Force kill with SIGKILL if graceful shutdown fails
3. **Tertiary**: Port-based cleanup (finds and kills any remaining processes on the ports)

## Common Issues and Solutions

### Issue: "Port 3000 is already in use" after stopping

**Solution**: Run `./cleanup-ports.sh` to force cleanup.

### Issue: Stop script says "stopped" but port still in use

**Solution**: This was the original bug. The enhanced stop script now prevents this by:
- Killing process groups instead of individual processes
- Always checking ports after process termination
- Force killing any remaining processes on the ports

### Issue: Can't find processes but port is in use

**Solution**: 
```bash
# Wait a few seconds (port might be in TIME_WAIT state)
sleep 5

# Or force cleanup
./cleanup-ports.sh
```

### Issue: lsof command not found

**Solution**: Install lsof:
```bash
# Ubuntu/Debian
sudo apt-get install lsof

# CentOS/RHEL
sudo yum install lsof

# macOS
# lsof is pre-installed
```

## Prevention

The enhanced scripts now prevent port conflicts by:

1. **Pre-flight checks**: Verifying ports are free before starting
2. **Clean shutdowns**: Properly terminating all related processes
3. **Port verification**: Confirming ports are released after stopping
4. **Graceful fallbacks**: Multiple mechanisms to ensure cleanup success

## References

- Linux Process Groups: `man kill`, `man ps`
- Port Management: `man lsof`
- Signal Handling: `man 7 signal`
