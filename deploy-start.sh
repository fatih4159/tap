#!/bin/bash

# =============================================================================
# DEPLOYMENT START SCRIPT - For EasyPanel/Production
# =============================================================================
# This script is designed to run on deployment platforms like EasyPanel
# where the code is deployed to /code directory
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

# Detect deployment directory (works for both /code and /workspace)
if [ -d "/code/backend" ]; then
    DEPLOY_DIR="/code"
elif [ -d "/workspace/backend" ]; then
    DEPLOY_DIR="/workspace"
else
    DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

cd "$DEPLOY_DIR"

print_header "TAP POS System - Deployment Startup"
print_info "Deploy directory: $DEPLOY_DIR"

# =============================================================================
# Create logs directory
# =============================================================================
mkdir -p "$DEPLOY_DIR/logs"
print_success "Logs directory ready: $DEPLOY_DIR/logs"

# =============================================================================
# Check Backend Dependencies
# =============================================================================
print_info "Checking backend dependencies..."
if [ ! -d "$DEPLOY_DIR/backend/node_modules" ]; then
    print_warning "Backend dependencies not found. Installing..."
    cd "$DEPLOY_DIR/backend"
    npm ci --production
    print_success "Backend dependencies installed"
    cd "$DEPLOY_DIR"
else
    print_success "Backend dependencies found"
fi

# =============================================================================
# Check Frontend Dependencies
# =============================================================================
print_info "Checking frontend dependencies..."
if [ ! -d "$DEPLOY_DIR/frontend/node_modules" ]; then
    print_warning "Frontend dependencies not found. Installing..."
    cd "$DEPLOY_DIR/frontend"
    npm ci --production
    print_success "Frontend dependencies installed"
    cd "$DEPLOY_DIR"
else
    print_success "Frontend dependencies found"
fi

# =============================================================================
# Build Frontend for Production
# =============================================================================
print_info "Building frontend for production..."
cd "$DEPLOY_DIR/frontend"

if [ ! -d "dist" ] || [ ! "$(ls -A dist 2>/dev/null)" ]; then
    print_warning "Frontend not built. Building now..."
    npm run build
    print_success "Frontend built successfully"
else
    print_info "Frontend already built (dist folder exists)"
fi

cd "$DEPLOY_DIR"

# =============================================================================
# Check Environment Variables
# =============================================================================
print_info "Checking environment configuration..."
if [ ! -f "$DEPLOY_DIR/backend/.env" ]; then
    print_warning "Backend .env file not found!"
    if [ -f "$DEPLOY_DIR/backend/.env.example" ]; then
        print_info "Copying .env.example to .env"
        cp "$DEPLOY_DIR/backend/.env.example" "$DEPLOY_DIR/backend/.env"
        print_warning "Please configure $DEPLOY_DIR/backend/.env with proper values"
    else
        print_error "No .env or .env.example found!"
    fi
else
    print_success "Backend .env file found"
fi

# =============================================================================
# Run Database Migrations (if needed)
# =============================================================================
if [ "$RUN_MIGRATIONS" = "true" ]; then
    print_info "Running database migrations..."
    cd "$DEPLOY_DIR/backend"
    npm run migrate || print_warning "Migration failed or not configured"
    cd "$DEPLOY_DIR"
fi

# =============================================================================
# Display Configuration
# =============================================================================
print_header "Configuration Summary"
echo ""
print_info "Directories:"
echo "  • Root:      $DEPLOY_DIR"
echo "  • Backend:   $DEPLOY_DIR/backend"
echo "  • Frontend:  $DEPLOY_DIR/frontend"
echo "  • Logs:      $DEPLOY_DIR/logs"
echo ""
print_info "Services:"
echo "  • Backend:   Port 3000"
echo "  • Frontend:  Port 5173"
echo ""
print_info "Log files:"
echo "  • Backend:   $DEPLOY_DIR/logs/backend.log"
echo "  • Frontend:  $DEPLOY_DIR/logs/frontend.log"
echo ""

# =============================================================================
# Start with Supervisord
# =============================================================================
print_header "Starting Services with Supervisord"

if command -v supervisord &> /dev/null; then
    # Copy supervisord.conf to /etc/supervisor/conf.d/ if needed
    if [ -f "$DEPLOY_DIR/supervisord.conf" ]; then
        print_info "Using supervisord configuration from: $DEPLOY_DIR/supervisord.conf"
        supervisord -c "$DEPLOY_DIR/supervisord.conf"
    else
        print_warning "supervisord.conf not found in $DEPLOY_DIR"
        print_info "Starting services manually..."
        
        # Start backend
        print_info "Starting backend..."
        cd "$DEPLOY_DIR/backend"
        npm start > "$DEPLOY_DIR/logs/backend.log" 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > "$DEPLOY_DIR/.backend.pid"
        print_success "Backend started (PID: $BACKEND_PID)"
        
        # Start frontend
        print_info "Starting frontend..."
        cd "$DEPLOY_DIR/frontend"
        npm run preview -- --host 0.0.0.0 --port 5173 > "$DEPLOY_DIR/logs/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > "$DEPLOY_DIR/.frontend.pid"
        print_success "Frontend started (PID: $FRONTEND_PID)"
        
        cd "$DEPLOY_DIR"
    fi
    
    print_success "Services started!"
else
    print_error "supervisord not found!"
    print_info "Starting services manually..."
    
    # Start backend
    print_info "Starting backend..."
    cd "$DEPLOY_DIR/backend"
    npm start > "$DEPLOY_DIR/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$DEPLOY_DIR/.backend.pid"
    print_success "Backend started (PID: $BACKEND_PID)"
    
    # Start frontend
    print_info "Starting frontend..."
    cd "$DEPLOY_DIR/frontend"
    npm run preview -- --host 0.0.0.0 --port 5173 > "$DEPLOY_DIR/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$DEPLOY_DIR/.frontend.pid"
    print_success "Frontend started (PID: $FRONTEND_PID)"
    
    cd "$DEPLOY_DIR"
fi

# =============================================================================
# Wait for Services
# =============================================================================
print_info "Waiting for services to be ready..."
sleep 5

# Check if backend is responding
if command -v curl &> /dev/null; then
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            print_success "Backend is responding on http://localhost:3000"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_warning "Backend may still be starting up. Check logs if issues persist."
    fi
else
    print_info "curl not available, cannot verify service health"
fi

echo ""
print_success "Deployment startup complete!"
echo ""
print_info "To view logs:"
echo "  • tail -f $DEPLOY_DIR/logs/backend.log"
echo "  • tail -f $DEPLOY_DIR/logs/frontend.log"
echo ""
print_info "To restart services with supervisorctl:"
echo "  • supervisorctl restart backend"
echo "  • supervisorctl restart frontend"
echo "  • supervisorctl status"
echo ""
