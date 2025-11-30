#!/bin/bash

# =============================================================================
# PORT CLEANUP SCRIPT - Force cleanup of ports 3000 and 5173
# =============================================================================
# Use this script if the normal stop.sh doesn't work or if you need to
# forcefully free up the ports
# =============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_header "Port Cleanup Utility"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PID file locations
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Clean up PID files
if [ -f "$BACKEND_PID_FILE" ]; then
    print_info "Removing backend PID file..."
    rm -f "$BACKEND_PID_FILE"
fi

if [ -f "$FRONTEND_PID_FILE" ]; then
    print_info "Removing frontend PID file..."
    rm -f "$FRONTEND_PID_FILE"
fi

# Function to kill processes on a specific port
kill_port() {
    local PORT=$1
    local NAME=$2
    
    print_info "Checking port $PORT ($NAME)..."
    
    if command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            print_warning "Found process(es) on port $PORT:"
            for PID in $PIDS; do
                PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
                echo "  • PID $PID ($PROCESS_INFO)"
            done
            
            print_info "Killing process(es) on port $PORT..."
            for PID in $PIDS; do
                # Try to get the process group and kill it
                PGID=$(ps -o pgid= $PID 2>/dev/null | tr -d ' ' || true)
                if [ ! -z "$PGID" ]; then
                    kill -9 -- -"$PGID" 2>/dev/null || true
                fi
                # Also kill the specific PID
                kill -9 $PID 2>/dev/null || true
            done
            
            # Wait a moment and verify
            sleep 1
            REMAINING=$(lsof -ti:$PORT 2>/dev/null || true)
            if [ -z "$REMAINING" ]; then
                print_success "Port $PORT is now free"
            else
                print_error "Failed to free port $PORT"
                return 1
            fi
        else
            print_success "Port $PORT is already free"
        fi
    else
        print_error "lsof not available. Cannot check ports."
        print_info "Install with: apt-get install lsof (or your package manager)"
        return 1
    fi
}

# Kill processes on both ports
kill_port 3000 "Backend"
echo ""
kill_port 5173 "Frontend"

echo ""
print_header "Cleanup Complete"
echo ""
print_info "You can now start the services with: ./start.sh"
echo ""
