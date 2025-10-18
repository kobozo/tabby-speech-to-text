#!/bin/bash

# Tabby Speech-to-Text Plugin Build Script
# This script pulls latest changes, installs dependencies, and builds the plugin

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

log_step() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ==>${NC} $1"
}

# Start build process
log_step "Starting Tabby Speech-to-Text build process..."
echo ""

# Step 1: Git Pull
log_step "Step 1/3: Pulling latest changes from Git..."
if git pull; then
    log_success "Git pull completed successfully"
else
    log_error "Git pull failed"
    exit 1
fi
echo ""

# Step 2: NPM Install
log_step "Step 2/3: Installing dependencies with npm..."
if npm install; then
    log_success "npm install completed successfully"
else
    log_error "npm install failed"
    exit 1
fi
echo ""

# Step 3: NPM Build
log_step "Step 3/3: Building the plugin..."
if npm run build; then
    log_success "npm build completed successfully"
else
    log_error "npm build failed"
    exit 1
fi
echo ""

# Final success message
echo ""
log_success "Build process completed successfully! 🎉"
log "Plugin is ready to use in Tabby Terminal"
echo ""
