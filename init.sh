#!/bin/bash

# =============================================================================
# INIT SCRIPT - Initial Setup for TAP POS System
# =============================================================================
# This script performs the initial setup of the application:
# - Checks system requirements
# - Installs dependencies
# - Sets up environment files
# - Initializes the database
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

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

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# =============================================================================
# Step 1: Check System Requirements
# =============================================================================
print_header "Step 1: Checking System Requirements"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm -v) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client (psql) not found. Make sure PostgreSQL is installed and accessible."
else
    print_success "PostgreSQL client detected"
fi

# =============================================================================
# Step 2: Setup Backend
# =============================================================================
print_header "Step 2: Setting up Backend"

cd backend

# Check if .env exists
if [ -f .env ]; then
    print_warning ".env file already exists in backend/"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env
        print_success "Created new .env file"
    else
        print_info "Keeping existing .env file"
    fi
else
    cp .env.example .env
    print_success "Created .env file from .env.example"
fi

# Install backend dependencies
print_info "Installing backend dependencies..."
if npm install; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

cd ..

# =============================================================================
# Step 3: Setup Frontend
# =============================================================================
print_header "Step 3: Setting up Frontend"

cd frontend

# Install frontend dependencies
print_info "Installing frontend dependencies..."
if npm install; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..

# =============================================================================
# Step 4: Database Setup
# =============================================================================
print_header "Step 4: Database Setup"

print_warning "Before proceeding with database migration, ensure:"
echo "  1. PostgreSQL is running"
echo "  2. Database credentials in backend/.env are correct"
echo "  3. Database 'gastro_pos' exists (or will be created)"
echo ""

read -p "Do you want to run database migrations now? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend
    
    print_info "Running database migrations..."
    if npm run migrate; then
        print_success "Database migrations completed"
        
        read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Seeding database..."
            if npm run seed; then
                print_success "Database seeded successfully"
            else
                print_warning "Database seeding failed (this is optional)"
            fi
        fi
    else
        print_warning "Database migration failed. Please check your database configuration."
        print_info "You can run migrations later with: cd backend && npm run migrate"
    fi
    
    cd ..
else
    print_info "Skipping database migrations. Run later with: cd backend && npm run migrate"
fi

# =============================================================================
# Step 5: Configuration Instructions
# =============================================================================
print_header "Step 5: Configuration"

print_info "Please review and update the following configuration:"
echo ""
echo "  📝 backend/.env - Update these settings:"
echo "     - DATABASE_URL: Your PostgreSQL connection string"
echo "     - JWT_SECRET: Change to a secure random string"
echo "     - STRIPE_SECRET_KEY: Your Stripe API key (if using payments)"
echo ""

# =============================================================================
# Completion
# =============================================================================
print_header "Initialization Complete!"

echo ""
print_success "The application has been initialized successfully!"
echo ""
print_info "Next steps:"
echo "  1. Review and update configuration in backend/.env"
echo "  2. Start the application: ./start.sh"
echo "  3. Access the application:"
echo "     - Frontend: http://localhost:5173"
echo "     - Backend API: http://localhost:3000"
echo ""
print_info "For more information, see README.md"
echo ""
