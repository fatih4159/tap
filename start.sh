#!/bin/bash

# =============================================================================
# START SCRIPT - Start TAP POS System
# =============================================================================
# This script starts both backend and frontend services in the background
# and saves their process IDs for later shutdown
# =============================================================================

set -e  # Exit on error

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
LOG_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# =============================================================================
# Check if services are already running
# =============================================================================
check_running() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            print_warning "Backend is already running (PID: $BACKEND_PID)"
            return 1
        else
            # PID file exists but process is not running, clean it up
            rm -f "$BACKEND_PID_FILE"
        fi
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            print_warning "Frontend is already running (PID: $FRONTEND_PID)"
            return 1
        else
            # PID file exists but process is not running, clean it up
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi
    
    return 0
}

# =============================================================================
# Start Services
# =============================================================================
print_header "Starting TAP POS System"

if ! check_running; then
    print_error "Services are already running. Stop them first with ./stop.sh"
    exit 1
fi

# Check if initialization was done
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    print_error "Dependencies not installed. Please run ./init.sh first"
    exit 1
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    print_error "Backend .env file not found. Please run ./init.sh first"
    exit 1
fi

# Start Backend
print_info "Starting backend server..."
cd backend

# Start backend in background and capture PID
npm start > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Wait a moment and check if process is still running
sleep 2
if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    print_success "Backend started (PID: $BACKEND_PID)"
    print_info "Backend logs: $BACKEND_LOG"
else
    print_error "Backend failed to start. Check logs: $BACKEND_LOG"
    rm -f "$BACKEND_PID_FILE"
    exit 1
fi

cd ..

# Start Frontend
print_info "Starting frontend server..."
cd frontend

# Start frontend in background and capture PID
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Wait a moment and check if process is still running
sleep 2
if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
    print_info "Frontend logs: $FRONTEND_LOG"
else
    print_error "Frontend failed to start. Check logs: $FRONTEND_LOG"
    rm -f "$FRONTEND_PID_FILE"
    # Also stop backend since frontend failed
    kill "$BACKEND_PID" 2>/dev/null || true
    rm -f "$BACKEND_PID_FILE"
    exit 1
fi

cd ..

# =============================================================================
# Display Status
# =============================================================================
print_header "Services Started Successfully!"

echo ""
print_success "Both services are now running in the background"
echo ""
print_info "Access URLs:"
echo "  • Frontend:  http://localhost:5173"
echo "  • Backend:   http://localhost:3000"
echo "  • Health:    http://localhost:3000/health"
echo ""
print_info "Process IDs:"
echo "  • Backend:   $BACKEND_PID"
echo "  • Frontend:  $FRONTEND_PID"
echo ""
print_info "Log files:"
echo "  • Backend:   $BACKEND_LOG"
echo "  • Frontend:  $FRONTEND_LOG"
echo ""
print_info "To stop services: ./stop.sh"
print_info "To view logs: tail -f $LOG_DIR/backend.log"
echo ""

# Optional: Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 3

# Check if backend is responding
if command -v curl &> /dev/null; then
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is responding on http://localhost:3000"
    else
        print_warning "Backend may still be starting up. Check logs if issues persist."
    fi
else
    print_info "Install 'curl' to verify service health automatically"
fi

echo ""
print_success "Startup complete!"
