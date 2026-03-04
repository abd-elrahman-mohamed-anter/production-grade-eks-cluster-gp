# ZAP Web Scanner - OWASP Vulnerability Scanner

A professional web vulnerability scanning application for detecting security issues including XSS, SQL injection, CSRF, insecure headers, and SSL/TLS problems.

## 📋 Getting Started

**First time setting up?** Follow the Quick Start below.

**Quick overview:** Use Docker for easy setup.

## Quick Start

### With Docker Desktop (Recommended - No Installation Needed!)

```bash
docker-compose up --build
```

Open `http://localhost:5000` in your browser.

**Note:** You may need to sign up/login to access the scanning features.

### With Node.js Locally

```bash
npm install      # Downloads dependencies (~500MB)
npm run dev      # Start development server
```

Open `http://localhost:5000` in your browser.

**Note:** You may need to sign up/login to access the scanning features.

## Features

- **Real-time Vulnerability Scanning**
  - Security header validation (CSP, HSTS, X-Frame-Options)
  - HTTPS/SSL enforcement checks
  - XSS vulnerability detection
  - CSRF protection analysis
  - Information disclosure detection

- **Dashboard & Analytics**
  - Scan history and status tracking
  - Vulnerability severity breakdown
  - Weekly activity charts

- **Report Generation**
  - Export reports as JSON or HTML
  - Detailed vulnerability findings
  - Remediation guidance

- **Scheduled Scans**
  - Set up recurring automated scans
  - Configure scan frequency and timing

- **API Access**
  - REST API for programmatic access
  - API key management
  - Scan automation support

## Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       └── lib/           # Utilities
├── server/                # Node.js backend
│   ├── index.ts           # Express app
│   ├── routes.ts          # API endpoints
│   ├── scanner.ts         # Vulnerability engine
│   └── storage.ts         # Data storage
├── shared/                # Shared types
│   └── schema.ts          # Data models
├── script/                # Build scripts
└── Dockerfile             # Docker configuration
```

## Technology Stack

**Frontend:**
- React 18+ with TypeScript
- Wouter for routing
- TanStack Query for state
- Tailwind CSS + shadcn/ui
- Recharts for visualization

**Backend:**
- Express.js with TypeScript
- Axios + Cheerio for web scraping
- In-memory storage (easily swappable)
- Drizzle ORM ready

## Environment Variables

See `.env.example` for all available options:

```bash
NODE_ENV=production      # or development
PORT=5000               # Server port
DATABASE_URL=           # Optional PostgreSQL
SESSION_SECRET=         # Optional session secret
```

Important: Before starting the app with Docker or locally, create a local `.env` from `.env.example` and set real secret values. The repository now ignores `.env` to avoid committing secrets.

Example (create `.env`):

```bash
cp .env.example .env
# then edit .env and set secure values (DB password, JWT secret, etc.)
```

If you use Docker Compose the service is configured to load the `.env` file via `env_file` in `docker-compose.yml`, so you do not need to hard-code secrets in the compose file.

Port: the application listens on port `5000` by default (mapped in Docker as `5000:5000`).

**Security (Secrets) Note**
- Secrets and passwords were removed from tracked files and moved to the local `.env` file which is listed in `.gitignore`.
- A safe `.env.example` was added containing placeholders for required variables. Do NOT commit real secrets.
- If any secret was previously exposed in a public repo, rotate/regenerate it (GitHub tokens, API keys, DB passwords, JWT secrets) immediately.

Quick checklist before running:
- Copy `.env.example` to `.env` and fill values.
- Ensure `.env` is not committed (it's included in `.gitignore`).
- Run `docker-compose up --build` or `npm run dev`.

## 🔒 Security & Dependency Auditing

This project includes automated security scanning to detect vulnerable dependencies.

### Running Security Audit

```bash
# Check for vulnerabilities
npm audit

# Attempt safe fixes (non-breaking updates)
npm audit fix

# If you need to fix all vulnerabilities (may include breaking changes)
npm audit fix --force
```

### What We Found & Fixed

- **Before:** 12 vulnerabilities (4 High, 7 Moderate, 1 Low)
- **After `npm audit fix`:** 5 vulnerabilities (5 Moderate, 0 High)
  - Fixed: `express`, `qs`, `body-parser`, `glob`, `lodash`, `brace-expansion`, `undici`
  - Remaining: 5 moderate-severity issues in `esbuild`/`vite` (require breaking version changes)

### Best Practices

- Run `npm audit` regularly during development
- Update dependencies frequently: `npm update`
- Review audit reports before deploying to production
- Never ignore critical or high-severity vulnerabilities

## Docker Deployment

### Production Build

```bash
docker-compose up --build
```

### Development with Hot Reload

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### View Logs

```bash
docker-compose logs -f
```

### Stop Container

```bash
docker-compose down
```

For detailed Docker instructions, see the commands above.

## API Endpoints

### Scanning
- `GET /api/stats` - Dashboard statistics
- `GET /api/scans` - List all scans
- `POST /api/scans` - Start new scan
- `GET /api/scans/:id` - Get scan details
- `DELETE /api/scans/:id` - Delete scan

### Reports
- `GET /api/reports/export/:scanId?format=json|html` - Export report

### Scheduling
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PATCH /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings
- `POST /api/settings/regenerate-key` - Regenerate API key

## Building for Production

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker-compose up --build
```

## Troubleshooting

### Deep Scan Issues

**Problem:** Deep scan completes but shows no vulnerabilities

**Solutions:**
1. **Check ZAP is running:**
   ```bash
   docker logs zap_daemon
   ```

2. **Test ZAP API directly:**
   ```bash
   curl http://localhost:8081/JSON/core/view/alerts
   ```

3. **Increase timeouts** if scanning large websites:
   - Deep scans need up to **2 hours** for thorough scanning
   - Monitor progress in the UI or logs

4. **Clear ZAP session** if previous scan had issues:
   ```bash
   curl http://localhost:8081/JSON/core/action/newSession?overwrite=true
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "ZAP daemon not ready" | Wait 30s for ZAP to start, then retry |
| Scan timeout on large sites | Use Medium scan instead of Deep |
| No results found | Check ZAP logs: `docker logs zap_daemon` |
| Empty alerts | Wait longer, ZAP may still be processing |

For detailed Deep scan improvements, check the troubleshooting section above.

## License

Designed for security research and vulnerability assessment.
