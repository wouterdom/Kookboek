# Automated Tailscale Configuration on Server Startup

This guide explains how to set up automatic Tailscale proxy configuration that runs on every server boot, ensuring the Kookboek app always works correctly after a reboot.

---

## Overview

The automated setup consists of:
1. **Bash script** (`tailscale-startup.sh`) - Configures Tailscale proxies
2. **Systemd service** (`tailscale-startup.service`) - Runs the script on boot
3. **Automatic logging** - Logs all actions to `/var/log/tailscale-startup.log`

---

## Installation Steps

### 1. Copy the Script to the Server

From your Windows PC:

```bash
# Navigate to the Kookboek repository
cd C:\Users\wdom\Kookboek

# Copy the script to the server
scp docs/scripts/tailscale-startup.sh wouter@192.168.1.63:~/tailscale-startup.sh

# Copy the service file
scp docs/scripts/tailscale-startup.service wouter@192.168.1.63:~/tailscale-startup.service
```

### 2. Install the Script on the Server

SSH to the server:

```bash
ssh wouter@192.168.1.63
```

Then run these commands:

```bash
# Move script to system location
sudo mv ~/tailscale-startup.sh /usr/local/bin/tailscale-startup.sh

# Make it executable
sudo chmod +x /usr/local/bin/tailscale-startup.sh

# Move service file to systemd
sudo mv ~/tailscale-startup.service /etc/systemd/system/tailscale-startup.service

# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to run on boot
sudo systemctl enable tailscale-startup.service

# Start the service now (test it)
sudo systemctl start tailscale-startup.service
```

### 3. Verify the Service is Running

```bash
# Check service status
sudo systemctl status tailscale-startup.service

# View the logs
sudo journalctl -u tailscale-startup.service -n 50

# Or view the dedicated log file
sudo tail -50 /var/log/tailscale-startup.log
```

You should see output indicating:
- ✓ Tailscale is ready
- ✓ Docker is ready
- ✓ Supabase Kong container is running and healthy
- ✓ Kookboek app proxy configured successfully
- ✓ Supabase API proxy configured successfully
- ✓ Vaultwarden proxy configured successfully
- ✓ Supabase API is responding correctly (HTTP 401)

---

## What the Service Does

### On Every Server Boot:

1. **Waits for services** - Ensures Tailscale and Docker are fully started
2. **Checks Kong container** - Verifies Supabase Kong is running and healthy
3. **Configures Tailscale proxies** with correct HTTP backends:
   - Port 443: Kookboek app → http://127.0.0.1:3000
   - Port 8443: Supabase API → http://127.0.0.1:8000 ✅
   - Port 8444: Vaultwarden → http://127.0.0.1:8222
4. **Tests the configuration** - Verifies Supabase API responds correctly
5. **Logs everything** - Creates detailed logs for troubleshooting

### Automatic Retry

If the service fails to start (e.g., Docker not ready), it will automatically retry after 10 seconds.

---

## Viewing Logs

### View systemd journal logs:
```bash
# Last 50 lines
sudo journalctl -u tailscale-startup.service -n 50

# Follow logs in real-time
sudo journalctl -u tailscale-startup.service -f

# Logs since last boot
sudo journalctl -u tailscale-startup.service -b
```

### View dedicated log file:
```bash
# Last 50 lines
sudo tail -50 /var/log/tailscale-startup.log

# Follow logs in real-time
sudo tail -f /var/log/tailscale-startup.log

# View entire log
sudo cat /var/log/tailscale-startup.log
```

---

## Testing the Setup

### Test 1: Manual Service Run

```bash
# Stop the service
sudo systemctl stop tailscale-startup.service

# Run it manually
sudo systemctl start tailscale-startup.service

# Check status
sudo systemctl status tailscale-startup.service

# View logs
sudo tail -20 /var/log/tailscale-startup.log
```

### Test 2: Reboot Test

```bash
# Reboot the server
sudo reboot

# Wait 2-3 minutes, then SSH back in
ssh wouter@192.168.1.63

# Check if service ran successfully
sudo systemctl status tailscale-startup.service

# Verify Tailscale configuration
tailscale serve status

# Should show all three proxies configured correctly
```

### Test 3: Verify App Works

```bash
# From your Windows PC
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401 (not 502!)

# Open in browser
# Visit: https://wotis.tail878d82.ts.net
# App should load recipes correctly
```

---

## Troubleshooting

### Service fails to start

**Check logs:**
```bash
sudo journalctl -u tailscale-startup.service -n 100 --no-pager
```

**Common issues:**
- Script not executable: `sudo chmod +x /usr/local/bin/tailscale-startup.sh`
- Tailscale not running: `sudo systemctl status tailscaled`
- Docker not running: `sudo systemctl status docker`

### Service runs but app still doesn't work

**Check Tailscale configuration:**
```bash
tailscale serve status
```

**Verify it shows HTTP backends (not HTTPS):**
```
https://wotis.tail878d82.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:8000    ← Must be HTTP!
```

**If wrong, manually fix:**
```bash
sudo tailscale serve --https=8443 off
sudo tailscale serve --bg --https=8443 http://127.0.0.1:8000
```

### Kong container not starting

**Check Kong status:**
```bash
docker ps | grep supabase-kong
```

**If not running, check what's using port 8443:**
```bash
sudo lsof -i :8443
```

**Restart Kong:**
```bash
docker start supabase-kong
```

---

## Disabling the Service

If you need to disable the automatic configuration:

```bash
# Stop the service
sudo systemctl stop tailscale-startup.service

# Disable from running on boot
sudo systemctl disable tailscale-startup.service

# Verify status
sudo systemctl status tailscale-startup.service
```

---

## Updating the Script

If you need to update the script:

1. **Edit the script** in the repository: `docs/scripts/tailscale-startup.sh`
2. **Copy to server:**
   ```bash
   scp docs/scripts/tailscale-startup.sh wouter@192.168.1.63:~/tailscale-startup.sh
   ```
3. **Install the update:**
   ```bash
   ssh wouter@192.168.1.63
   sudo mv ~/tailscale-startup.sh /usr/local/bin/tailscale-startup.sh
   sudo chmod +x /usr/local/bin/tailscale-startup.sh
   sudo systemctl restart tailscale-startup.service
   ```

---

## Manual Configuration (If Service Fails)

If the automated service fails, you can always configure manually:

```bash
ssh wouter@192.168.1.63

# Configure all proxies
sudo tailscale serve --bg --https 443 http://127.0.0.1:3000
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222

# Verify
tailscale serve status
```

---

## Related Documentation

- [Tailscale + Supabase Troubleshooting](TAILSCALE-SUPABASE-TROUBLESHOOTING.md) - Detailed issue diagnosis
- [Server Setup Documentation](../../Server%20setup/) - Complete server setup guides

---

**Questions or Issues?**

Check the logs first:
```bash
sudo tail -50 /var/log/tailscale-startup.log
```

Then verify the configuration:
```bash
tailscale serve status
systemctl status tailscale-startup.service
```
