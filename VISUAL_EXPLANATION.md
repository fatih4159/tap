# Port 3000 Issue - Visual Explanation

## The Problem (Before Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    Terminal: ./start.sh                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  npm start  │  ◄─── PID saved to .backend.pid
                    └──────┬──────┘
                           │
                           │ spawns child
                           ▼
                    ┌─────────────┐
                    │ node process│  ◄─── Actually binds to port 3000
                    └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Terminal: ./stop.sh                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                Read PID from .backend.pid
                           │
                           ▼
                    ┌─────────────┐
                    │  npm start  │  ◄─── Kill this process only
                    └──────┬──────┘
                           │
                           │ ❌ Child becomes orphaned!
                           ▼
                    ┌─────────────┐
                    │ node process│  ◄─── Still running! Port 3000 in use!
                    └─────────────┘

RESULT: Port 3000 still occupied, next start fails!
```

## The Solution (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    Terminal: ./start.sh                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              Check if ports 3000 & 5173 are free
                           │
                           ▼ (if free)
                    ┌─────────────┐
                    │  npm start  │  ◄─── PID saved to .backend.pid
                    └──────┬──────┘       Process Group ID: PGID
                           │
                           │ spawns child (same process group)
                           ▼
                    ┌─────────────┐
                    │ node process│  ◄─── Binds to port 3000
                    └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Terminal: ./stop.sh                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                Read PID from .backend.pid
                           │
                           ▼
                Get Process Group ID (PGID)
                           │
                           ▼
              ┌────────────────────────────────┐
              │  kill -- -PGID                 │
              │  (kills entire process group)  │
              └────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
         ┌─────────────┐      ┌─────────────┐
         │  npm start  │  ✓   │ node process│  ✓
         └─────────────┘      └─────────────┘
            Terminated           Terminated
                           │
                           ▼
         Verify ports 3000 & 5173 are free
                           │
                           ▼
         Force kill any remaining processes
                           │
                           ▼
         ┌────────────────────────────────────┐
         │  Port 3000: FREE ✓                 │
         │  Port 5173: FREE ✓                 │
         └────────────────────────────────────┘

RESULT: Ports properly released, next start succeeds!
```

## Key Technical Concepts

### Process Groups

```
Process Group (PGID: 12345)
├── npm process (PID: 12345)  ◄─── Parent
└── node process (PID: 12346) ◄─── Child

Killing PGID terminates ALL processes in the group
```

### Kill Commands

```bash
# Old way (WRONG) - only kills parent
kill 12345

# New way (CORRECT) - kills entire group
kill -- -12345

# The negative sign means "kill process group"
```

## Flow Comparison

### Before Fix (Broken)

1. User runs `./start.sh`
2. npm starts → spawns node → port 3000 occupied
3. User runs `./stop.sh`
4. Script kills npm process only
5. node process orphaned, still using port 3000
6. User runs `./start.sh` again
7. **ERROR**: Port 3000 already in use

### After Fix (Working)

1. User runs `./start.sh`
2. Check ports are free ✓
3. npm starts → spawns node → port 3000 occupied
4. User runs `./stop.sh`
5. Script gets process group ID
6. Script kills entire process group (npm + node)
7. Script verifies ports are free
8. Script force kills any remaining processes on ports
9. User runs `./start.sh` again
10. **SUCCESS**: Ports are free, services start normally

## Verification Steps

```bash
# Before stopping
$ lsof -i:3000
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12346 user   20u  IPv6 123456      0t0  TCP *:3000 (LISTEN)

# After ./stop.sh
$ lsof -i:3000
# (no output - port is free)

# Start again
$ ./start.sh
# ✓ Backend started successfully
```

## Multiple Layers of Protection

The fix includes **three layers** of cleanup:

```
Layer 1: Process Group Kill
├── Graceful shutdown (SIGTERM)
└── Force kill if needed (SIGKILL -9)

Layer 2: Verify Process Stopped
├── Check if PID still exists
└── Report success/failure

Layer 3: Port-Based Cleanup
├── Use lsof to find processes on ports
├── Kill any remaining processes
└── Verify ports are free

Result: Port 3000 is GUARANTEED to be free
```

## Emergency Recovery

If something still goes wrong:

```
./cleanup-ports.sh
        │
        ▼
Remove stale PID files
        │
        ▼
Find ALL processes on ports 3000 & 5173
        │
        ▼
Kill process groups + individual processes
        │
        ▼
Verify ports are free
        │
        ▼
Ready to start fresh!
```

## Why This Matters

**Reliability**: Services can be stopped and started repeatedly without issues

**Developer Experience**: No more manual port cleanup

**Production Ready**: Proper process lifecycle management

**Debugging**: Clear feedback about what's happening
