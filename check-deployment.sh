#!/bin/bash

# =============================================================================
# DEPLOYMENT SUMMARY
# =============================================================================
# This script shows a summary of the deployment configuration
# Use this to verify your deployment is correctly configured
# =============================================================================

echo "=========================================="
echo "TAP POS System - Deployment Configuration"
echo "=========================================="
echo ""

# Check deployment directory
if [ -d "/code" ]; then
    DEPLOY_DIR="/code"
elif [ -d "/workspace" ]; then
    DEPLOY_DIR="/workspace"
else
    DEPLOY_DIR="$(pwd)"
fi

echo "Deployment Directory: $DEPLOY_DIR"
echo ""

# Check required files
echo "Required Files:"
echo "----------------------------------------"

files=(
    "$DEPLOY_DIR/supervisord.conf"
    "$DEPLOY_DIR/deploy-start.sh"
    "$DEPLOY_DIR/backend/package.json"
    "$DEPLOY_DIR/frontend/package.json"
    "$DEPLOY_DIR/backend/.env"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $(basename $file) - Found"
    else
        echo "✗ $(basename $file) - Missing"
    fi
done

echo ""

# Check directories
echo "Required Directories:"
echo "----------------------------------------"

dirs=(
    "$DEPLOY_DIR/backend"
    "$DEPLOY_DIR/frontend"
    "$DEPLOY_DIR/backend/node_modules"
    "$DEPLOY_DIR/frontend/node_modules"
    "$DEPLOY_DIR/frontend/dist"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ $(basename $dir) - Found"
    else
        echo "✗ $(basename $dir) - Missing"
    fi
done

echo ""

# Check if services are running
echo "Service Status:"
echo "----------------------------------------"

if command -v supervisorctl &> /dev/null; then
    supervisorctl status 2>/dev/null || echo "Supervisord not running"
else
    echo "Supervisord not installed"
fi

echo ""

# Check ports
echo "Port Status:"
echo "----------------------------------------"

if command -v lsof &> /dev/null; then
    if lsof -ti:3000 &> /dev/null; then
        echo "✓ Port 3000 (Backend) - In Use"
    else
        echo "○ Port 3000 (Backend) - Free"
    fi
    
    if lsof -ti:5173 &> /dev/null; then
        echo "✓ Port 5173 (Frontend) - In Use"
    else
        echo "○ Port 5173 (Frontend) - Free"
    fi
else
    echo "lsof not available"
fi

echo ""

# Quick start guide
echo "Quick Start:"
echo "----------------------------------------"
echo "1. Deploy code to /code directory"
echo "2. Run: cd /code && ./deploy-start.sh"
echo "3. Check: supervisorctl status"
echo "4. View logs: tail -f /code/logs/backend.log"
echo ""
echo "For detailed instructions, see:"
echo "  • EASYPANEL_SETUP.md (Quick guide)"
echo "  • DEPLOYMENT.md (Complete guide)"
echo ""
