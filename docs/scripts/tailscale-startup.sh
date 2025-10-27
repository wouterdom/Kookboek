#!/bin/bash
# Tailscale Serve Configuration Startup Script
# Ensures correct Tailscale proxy configuration after server reboot
#
# This script:
# 1. Waits for Tailscale and Docker to be ready
# 2. Verifies Supabase Kong container is running
# 3. Configures Tailscale serve proxies with correct HTTP backends
#
# Installation:
#   1. Copy this script to: /usr/local/bin/tailscale-startup.sh
#   2. Make executable: sudo chmod +x /usr/local/bin/tailscale-startup.sh
#   3. Create systemd service (see tailscale-startup.service)
#
# Author: Automated setup for Kookboek app
# Last Updated: October 27, 2025

set -e  # Exit on error

# Logging
LOG_FILE="/var/log/tailscale-startup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "=========================================="
echo "Tailscale Startup Configuration"
echo "$(date)"
echo "=========================================="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if a service is ready
wait_for_service() {
    local max_attempts=30
    local attempt=1
    local service_name=$1
    local check_command=$2

    log "Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" > /dev/null 2>&1; then
            log "$service_name is ready"
            return 0
        fi
        log "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log "ERROR: $service_name failed to become ready after $max_attempts attempts"
    return 1
}

# Wait for Tailscale to be ready
wait_for_service "Tailscale" "tailscale status"

# Wait for Docker to be ready
wait_for_service "Docker" "docker ps"

# Wait a bit more for containers to start
log "Waiting 10 seconds for Docker containers to initialize..."
sleep 10

# Check if Supabase Kong container is running
log "Checking Supabase Kong container status..."
if docker ps | grep -q "supabase-kong.*Up.*healthy"; then
    log "Supabase Kong container is running and healthy"
elif docker ps | grep -q "supabase-kong.*Up"; then
    log "Supabase Kong container is running (health check pending)"
else
    log "WARNING: Supabase Kong container is not running! Attempting to start..."
    docker start supabase-kong || log "ERROR: Failed to start Kong container"
    sleep 5
fi

# Check current Tailscale configuration
log "Checking current Tailscale serve configuration..."
tailscale serve status

# Configure Tailscale serve proxies
log "Configuring Tailscale serve proxies..."

# Configure Kookboek app (port 443)
log "Configuring Kookboek app on port 443..."
tailscale serve --https=443 off 2>/dev/null || true
tailscale serve --bg --https=443 http://127.0.0.1:3000
if [ $? -eq 0 ]; then
    log "✓ Kookboek app proxy configured successfully"
else
    log "✗ Failed to configure Kookboek app proxy"
fi

# Configure Supabase API (port 9443) - CRITICAL: Use HTTP backend and port 9443!
# Port 8443 is reserved for Kong HTTPS direct access
log "Configuring Supabase API on port 9443 (HTTP backend)..."
tailscale serve --https=9443 off 2>/dev/null || true
tailscale serve --bg --https=9443 http://127.0.0.1:8000
if [ $? -eq 0 ]; then
    log "✓ Supabase API proxy configured successfully on port 9443"
else
    log "✗ Failed to configure Supabase API proxy"
fi

# Ensure port 8443 is NOT used by Tailscale (Kong needs it)
log "Ensuring Tailscale does not use port 8443 (reserved for Kong)..."
tailscale serve --https=8443 off 2>/dev/null || true

# Configure Vaultwarden (port 8444)
log "Configuring Vaultwarden on port 8444..."
tailscale serve --https=8444 off 2>/dev/null || true
tailscale serve --bg --https=8444 http://127.0.0.1:8222
if [ $? -eq 0 ]; then
    log "✓ Vaultwarden proxy configured successfully"
else
    log "✗ Failed to configure Vaultwarden proxy"
fi

# Verify final configuration
log "Final Tailscale serve configuration:"
tailscale serve status

# Test Supabase API endpoint on port 9443
log "Testing Supabase API endpoint on port 9443..."
sleep 3  # Give services a moment to stabilize
if curl -k -f -s -o /dev/null -w "%{http_code}" https://wotis.tail878d82.ts.net:9443/rest/v1/ | grep -q "401"; then
    log "✓ Supabase API is responding correctly on port 9443 (HTTP 401)"
else
    log "⚠ WARNING: Supabase API test on port 9443 did not return expected HTTP 401"
fi

log "=========================================="
log "Tailscale startup configuration completed"
log "=========================================="

exit 0
