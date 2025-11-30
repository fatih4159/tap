#!/bin/bash

# =============================================================================
# STOP SCRIPT - Stop TAP POS System
# =============================================================================
# This script stops both backend and frontend services gracefully
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

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PID file locations
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# =============================================================================
# Stop Services
# =============================================================================
print_header "Stopping TAP POS System"

STOPPED_COUNT=0
FAILED_COUNT=0

# Stop Backend
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    
    if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        print_info "Stopping backend (PID: $BACKEND_PID)..."
        
        # Kill the entire process group (npm and all its children)
        # This ensures child processes (node) are also killed
        PGID=$(ps -o pgid= "$BACKEND_PID" | tr -d ' ')
        
        # Try graceful shutdown first
        kill -- -"$PGID" 2>/dev/null || kill "$BACKEND_PID" 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        for i in {1..10}; do
            if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            print_warning "Forcing backend shutdown..."
            kill -9 -- -"$PGID" 2>/dev/null || kill -9 "$BACKEND_PID" 2>/dev/null
            sleep 1
        fi
        
        # Verify it's stopped
        if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            print_success "Backend stopped"
            ((STOPPED_COUNT++))
        else
            print_error "Failed to stop backend"
            ((FAILED_COUNT++))
        fi
    else
        print_warning "Backend PID file exists but process not found"
    fi
    
    # Clean up PID file
    rm -f "$BACKEND_PID_FILE"
else
    print_info "Backend is not running (no PID file found)"
fi

# Stop Frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    
    if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        print_info "Stopping frontend (PID: $FRONTEND_PID)..."
        
        # Kill the entire process group (npm and all its children)
        # This ensures child processes (node/vite) are also killed
        PGID=$(ps -o pgid= "$FRONTEND_PID" | tr -d ' ')
        
        # Try graceful shutdown first
        kill -- -"$PGID" 2>/dev/null || kill "$FRONTEND_PID" 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        for i in {1..10}; do
            if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            print_warning "Forcing frontend shutdown..."
            kill -9 -- -"$PGID" 2>/dev/null || kill -9 "$FRONTEND_PID" 2>/dev/null
            sleep 1
        fi
        
        # Verify it's stopped
        if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            print_success "Frontend stopped"
            ((STOPPED_COUNT++))
        else
            print_error "Failed to stop frontend"
            ((FAILED_COUNT++))
        fi
    else
        print_warning "Frontend PID file exists but process not found"
    fi
    
    # Clean up PID file
    rm -f "$FRONTEND_PID_FILE"
else
    print_info "Frontend is not running (no PID file found)"
fi

# =============================================================================
# Additional Cleanup - Kill any remaining node processes on ports 3000 and 5173
# =============================================================================
print_info "Checking for any remaining processes on ports 3000 and 5173..."

# Check port 3000 (backend)
if command -v lsof &> /dev/null; then
    BACKEND_PORT_PIDS=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$BACKEND_PORT_PIDS" ]; then
        print_warning "Found process(es) on port 3000, killing them..."
        for PID in $BACKEND_PORT_PIDS; do
            kill -9 "$PID" 2>/dev/null || true
            print_success "Killed process $PID on port 3000"
        done
    else
        print_success "Port 3000 is free"
    fi
    
    # Check port 5173 (frontend)
    FRONTEND_PORT_PIDS=$(lsof -ti:5173 2>/dev/null || true)
    if [ ! -z "$FRONTEND_PORT_PIDS" ]; then
        print_warning "Found process(es) on port 5173, killing them..."
        for PID in $FRONTEND_PORT_PIDS; do
            kill -9 "$PID" 2>/dev/null || true
            print_success "Killed process $PID on port 5173"
        done
    else
        print_success "Port 5173 is free"
    fi
else
    print_warning "lsof not available, cannot verify ports are free"
    print_info "Install lsof with: apt-get install lsof (or your package manager)"
fi

# =============================================================================
# Display Status
# =============================================================================
print_header "Shutdown Complete"

echo ""
if [ $STOPPED_COUNT -gt 0 ]; then
    print_success "Stopped $STOPPED_COUNT service(s)"
fi

if [ $FAILED_COUNT -gt 0 ]; then
    print_error "Failed to stop $FAILED_COUNT service(s)"
    echo ""
    print_info "You may need to manually check for remaining processes:"
    echo "  ps aux | grep node"
    echo ""
    exit 1
fi

if [ $STOPPED_COUNT -eq 0 ]; then
    print_info "No services were running"
fi

echo ""
print_info "To start services again: ./start.sh"
echo ""
