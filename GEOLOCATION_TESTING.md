# Geolocation API Testing Guide

## Status ✅

HTTPS infrastructure is now **ready** for geolocation testing on local network.

### What's Configured

- ✅ Self-signed SSL certificates generated at `./certs/cert.pem` and `./certs/key.pem`
- ✅ Vite dev server auto-detects and enables HTTPS when certificates exist
- ✅ Network access enabled via local IP (e.g., `https://192.168.15.7:5178/`)
- ✅ API proxy updated to use HTTPS when certificates are present
- ✅ npm scripts available: `npm run certs:generate` and `npm run certs:setup`

---

## Quick Start

### 1. Start the Dev Server

```bash
npm run dev:web
```

The server will output:
```
VITE v8.1.4  ready in 427 ms

  ➜  Local:   https://localhost:5178/
  ➜  Network: https://192.168.15.7:5178/
  ➜  press h + enter to show help
```

### 2. Test Geolocation Locally

Open browser DevTools Console and run:

```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    console.log(`Lat: ${latitude}, Lon: ${longitude}`);
  },
  (error) => {
    console.error(`Error: ${error.message}`);
  }
);
```

**Expected Result:**
- Browser shows permission prompt
- Grant location access
- Coordinates appear in console

---

## Testing from Network Devices

### Setup

1. Find your machine's local IP address:
   ```powershell
   ipconfig
   # Look for "IPv4 Address" under your active connection
   # Example: 192.168.1.100
   ```

2. From another device on the network, visit:
   ```
   https://YOUR_IP:5178/
   ```
   (Replace `YOUR_IP` with your machine's IPv4 address)

3. Browser will warn about self-signed certificate:
   - Chrome/Edge: Click "Advanced" → "Proceed to site (unsafe)"
   - Firefox: Click "Advanced" → "Accept the Risk and Continue"
   - Safari: Click "Show Details" → "Visit this website"

### Test Geolocation

1. Open DevTools Console on the remote device
2. Run the geolocation code above
3. Grant location permission when prompted
4. Verify coordinates appear

---

## Testing Address Capture Feature

Once geolocation is working:

1. Create a new construction opportunity
2. Enable geolocation (if available in the form)
3. Verify:
   - Coordinates are captured: `{ latitude, longitude }`
   - Geocoding service resolves address from coordinates
   - Address is pre-filled in the form

### Expected API Calls

```
POST /api/construction-opportunities/capture-location
{
  "latitude": 12.345678,
  "longitude": -98.765432
}

Response:
{
  "address": "Rua Example, 123, São Paulo - SP, Brazil",
  "city": "São Paulo",
  "state": "SP",
  "coordinates": { "lat": 12.345678, "lon": -98.765432 }
}
```

---

## Certificate Management

### Using Self-Signed Certificates (Current)

**Pros:**
- Cross-platform compatible (Windows, Mac, Linux)
- Zero setup required (auto-generated)
- Good for development and testing

**Cons:**
- Browser shows security warning
- Some APIs may require user interaction

### Upgrading to Browser-Trusted Certificates

For zero browser warnings, install **mkcert**:

```powershell
choco install mkcert
```

Then regenerate certificates:

```bash
npm run certs:generate
```

The script will auto-detect mkcert and generate browser-trusted certificates.

---

## Troubleshooting

### "HTTPS is not working"

- **Check 1:** Verify certificates exist:
  ```bash
  ls ./certs/
  # Should show: cert.pem, key.pem
  ```

- **Check 2:** Restart the dev server:
  ```bash
  npm run dev:web
  ```

- **Check 3:** Check browser console for errors (usually certificate warnings)

### "Geolocation permission denied"

- Grant location permission in browser settings
- Some VPNs or proxies may block geolocation
- Test with a simple `navigator.geolocation.getCurrentPosition()` call first

### "Mixed content blocked"

If you see "blocked by Mixed Content Policy":
- Ensure API proxy target uses `https://` when certificates are present
- Current vite.config.ts handles this automatically
- Restart dev server if you changed certificate status

### "Certificate in Windows is not trusted"

Windows doesn't trust self-signed certificates by default. Options:

1. **Accept the risk:** Add exception in browser settings
2. **Use mkcert:** Generates browser-trusted certificates
3. **Use Microsoft-signed certificate:** Advanced setup (not recommended for development)

---

## File Locations

- **Certificates:** `./certs/cert.pem`, `./certs/key.pem`
- **Generation script:** `./generate-certs.js`
- **Setup script (PowerShell):** `./scripts/setup-https.ps1`
- **Vite config:** `./apps/web/vite.config.ts`
- **Dev server:**
  - Frontend: `https://localhost:5178/` (or `https://YOUR_IP:5178/`)
  - API proxy: Configured in vite.config.ts

---

## Environment Variables

No environment variables needed for HTTPS setup. Certificate detection is automatic.

To disable HTTPS temporarily, rename or move the `./certs/` directory:
```bash
mv certs certs.backup
npm run dev:web  # Will run on HTTP
```

To re-enable:
```bash
mv certs.backup certs
npm run dev:web  # Will run on HTTPS
```

---

## Next Steps

1. **Test locally:** `npm run dev:web` → Verify HTTPS works
2. **Test geolocation:** Use DevTools console to test `navigator.geolocation`
3. **Test from network:** Connect another device to same network and test
4. **Implement address capture:** Integrate geolocation API into opportunity creation form
5. **Test feature end-to-end:** Create opportunity with location capture enabled

---

## References

- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MDN: HTTPS Requirements](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Vite HTTPS Configuration](https://vite.dev/config/server-options.html#server-https)
