# Start Script Update - Auto Install lsof and Port Cleanup

## Changes Made

The `start.sh` script has been enhanced to automatically handle port conflicts and ensure smooth startup.

## What's New

### 1. Automatic lsof Installation

The script now automatically detects if `lsof` is installed and installs it if needed. It supports multiple package managers:

- **apt-get** (Debian/Ubuntu)
- **apt** (Debian/Ubuntu)
- **yum** (RedHat/CentOS)
- **brew** (macOS)

```bash
install_lsof() {
    if ! command -v lsof &> /dev/null; then
        print_info "lsof not found. Installing..."
        # Detects package manager and installs automatically
    fi
}
```

### 2. Automatic Port Cleanup

Before starting services, the script now:
1. Installs lsof if not present
2. Runs the `cleanup-ports.sh` script to free up ports 3000 and 5173
3. Verifies no services are running
4. Then starts the backend and frontend

## Startup Flow

```
./start.sh
    ↓
1. Install lsof (if needed)
    ↓
2. Run cleanup-ports.sh
    ↓
3. Verify ports are free
    ↓
4. Start backend (port 3000)
    ↓
5. Start frontend (port 5173)
    ↓
6. Verify services are running
```

## Benefits

✓ **No manual intervention** - lsof is installed automatically
✓ **Port conflicts resolved** - Ports are cleaned before startup
✓ **Cleaner startup** - No more "port in use" errors
✓ **Cross-platform** - Works with multiple package managers

## Usage

Just run the start script as usual:

```bash
./start.sh
```

The script will:
- Check if lsof is installed (install if needed)
- Clean up any processes using ports 3000 or 5173
- Start both backend and frontend services
- Display access URLs and logs

## Manual Port Cleanup

You can still manually clean ports if needed:

```bash
./cleanup-ports.sh
```

## Files Modified

- `start.sh` - Added lsof installation and port cleanup functions

## Date

November 30, 2025
