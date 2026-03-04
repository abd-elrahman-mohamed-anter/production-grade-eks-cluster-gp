import axios from 'axios';
import type { InsertVulnerability } from '@shared/schema';

/**
 * httpxService — Pure Node.js/Axios replacement for the httpx binary.
 *
 * Strategy:
 *   1. Try a HEAD request first (fast, no body download)
 *   2. Fall back to a GET request if HEAD fails or is blocked
 *   3. Parse <title> from the HTML body (GET response only)
 *   4. Extract Server and Content-Type from response headers
 *
 * No external binary needed — works on Windows, Linux, and inside Docker.
 *
 * Also includes analyzeVulnerabilities() for Shallow scan mode:
 *   - Inspects HTTP headers for common misconfigurations
 *   - Checks for information disclosure, missing security headers, etc.
 *   - Returns 5-8 diverse findings without needing nmap/nikto
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; CyberShield-Scanner/1.0)';

const BASE_CONFIG = {
  timeout: 25000,       // 25 seconds max
  maxRedirects: 5,
  validateStatus: () => true,  // never throw on 4xx/5xx, handle manually
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
};

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return match ? match[1].trim() : '';
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Shallow Vulnerability Analyzer
 *  Detects realistic misconfigurations purely from HTTP headers + HTML body
 * ──────────────────────────────────────────────────────────────────────────*/
export interface ShallowFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  affectedUrl: string;
  details: string;
  remediation: string;
}

function analyzeHeaders(
  url: string,
  statusCode: number,
  headers: Record<string, any>,
  body: string,
  title: string,
): ShallowFinding[] {
  const findings: ShallowFinding[] = [];

  const h = (name: string): string => (headers[name] || '').toString().toLowerCase();
  const has = (name: string): boolean => !!headers[name];

  // ── 1. Server / Technology Disclosure ───────────────────────────────────
  const server = headers['server'] || '';
  const xPoweredBy = headers['x-powered-by'] || '';

  if (server) {
    // Check if version is exposed (e.g., "Apache/2.4.51" or "nginx/1.18.0")
    const versionPattern = /[/\s][\d]+\.[\d]+/;
    if (versionPattern.test(server.toString())) {
      findings.push({
        type: 'information-disclosure',
        severity: 'medium',
        title: 'Web Server Version Disclosure',
        description: `The server header reveals the exact web server software version: "${server}". This information helps attackers identify known vulnerabilities for this specific version.`,
        affectedUrl: url,
        details: `Server: ${server}`,
        remediation: 'Configure the web server to suppress version information. For Apache, set "ServerTokens Prod". For nginx, set "server_tokens off".',
      });
    } else if (server) {
      findings.push({
        type: 'information-disclosure',
        severity: 'low',
        title: 'Server Technology Disclosure',
        description: `The server header reveals the underlying web technology: "${server}". Attackers can use this to narrow down targeted attacks.`,
        affectedUrl: url,
        details: `Server: ${server}`,
        remediation: 'Remove or obfuscate the Server response header.',
      });
    }
  }

  if (xPoweredBy) {
    findings.push({
      type: 'information-disclosure',
      severity: 'medium',
      title: 'Framework/Language Disclosure via X-Powered-By',
      description: `The response header "X-Powered-By: ${xPoweredBy}" exposes the backend technology stack. This can facilitate targeted framework-specific attacks.`,
      affectedUrl: url,
      details: `X-Powered-By: ${xPoweredBy}`,
      remediation: 'Disable the X-Powered-By header. In Express.js use "app.disable(\'x-powered-by\')". In PHP, set "expose_php = Off" in php.ini.',
    });
  }

  // ── 2. Missing Security Headers ─────────────────────────────────────────
  const csp = has('content-security-policy');
  const hsts = has('strict-transport-security');
  const xfo = has('x-frame-options');
  const xcto = has('x-content-type-options');
  const referrer = has('referrer-policy');
  const permissions = has('permissions-policy');

  if (!hsts && url.startsWith('https')) {
    findings.push({
      type: 'ssl-tls',
      severity: 'high',
      title: 'Missing HTTP Strict Transport Security (HSTS)',
      description: 'The HTTPS response does not include a Strict-Transport-Security (HSTS) header. Without HSTS, users could be downgraded to HTTP connections, enabling man-in-the-middle attacks.',
      affectedUrl: url,
      details: 'Header "Strict-Transport-Security" is absent from the HTTPS response.',
      remediation: 'Add the header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    });
  }

  if (!xfo) {
    findings.push({
      type: 'web',
      severity: 'medium',
      title: 'Missing X-Frame-Options Header (Clickjacking Risk)',
      description: 'The application does not send the X-Frame-Options header, making it potentially vulnerable to Clickjacking attacks where attackers embed the page in an iframe to trick users into unintended actions.',
      affectedUrl: url,
      details: 'Header "X-Frame-Options" is absent. The page can be framed by external sites.',
      remediation: 'Add the header: X-Frame-Options: DENY   (or SAMEORIGIN if framing within the same origin is needed). Alternatively, use Content-Security-Policy: frame-ancestors \'none\'.',
    });
  }

  if (!xcto) {
    findings.push({
      type: 'web',
      severity: 'low',
      title: 'Missing X-Content-Type-Options Header',
      description: 'The X-Content-Type-Options header is not set to "nosniff". Browsers may perform MIME-type sniffing, which can lead to XSS vulnerabilities when serving user-uploaded files.',
      affectedUrl: url,
      details: 'Header "X-Content-Type-Options: nosniff" is absent.',
      remediation: 'Add the header: X-Content-Type-Options: nosniff',
    });
  }

  if (!csp) {
    findings.push({
      type: 'web',
      severity: 'medium',
      title: 'Missing Content-Security-Policy (CSP) Header',
      description: 'No Content-Security-Policy header was found. Without CSP, the application is more vulnerable to Cross-Site Scripting (XSS) and data injection attacks.',
      affectedUrl: url,
      details: 'Header "Content-Security-Policy" is absent.',
      remediation: 'Implement a Content-Security-Policy header that restricts allowed content sources. Start with a policy like: Content-Security-Policy: default-src \'self\'',
    });
  }

  if (!referrer) {
    findings.push({
      type: 'information-disclosure',
      severity: 'low',
      title: 'Missing Referrer-Policy Header',
      description: 'No Referrer-Policy header was detected. Without this header, browsers may send the full URL (including sensitive query parameters) as a Referer header to third-party sites.',
      affectedUrl: url,
      details: 'Header "Referrer-Policy" is absent.',
      remediation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
    });
  }

  // ── 3. Cookie Security ───────────────────────────────────────────────────
  const setCookie = headers['set-cookie'];
  if (setCookie) {
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie.toString()];
    let hasInsecureCookie = false;
    let missingHttpOnly = false;
    let cookieDetails = '';

    for (const cookie of cookies) {
      const cookieStr = cookie.toString().toLowerCase();
      if (!cookieStr.includes('secure') && url.startsWith('https')) {
        hasInsecureCookie = true;
        cookieDetails += `Cookie without "Secure" flag: ${cookie.toString().split(';')[0]}\n`;
      }
      if (!cookieStr.includes('httponly')) {
        missingHttpOnly = true;
        cookieDetails += `Cookie without "HttpOnly" flag: ${cookie.toString().split(';')[0]}\n`;
      }
    }

    if (hasInsecureCookie || missingHttpOnly) {
      findings.push({
        type: 'web',
        severity: 'high',
        title: 'Insecure Cookie Configuration',
        description: `One or more cookies are missing security flags. Missing "Secure" flag allows cookies to be sent over HTTP. Missing "HttpOnly" flag allows JavaScript to access cookies, facilitating XSS cookie theft.`,
        affectedUrl: url,
        details: cookieDetails.trim() || 'Cookie security flags are missing.',
        remediation: 'Set "Secure" and "HttpOnly" flags on all session cookies. Also consider adding "SameSite=Strict" or "SameSite=Lax" to prevent CSRF.',
      });
    }
  }

  // ── 4. HTTP vs HTTPS ─────────────────────────────────────────────────────
  if (url.startsWith('http://')) {
    findings.push({
      type: 'ssl-tls',
      severity: 'high',
      title: 'Unencrypted HTTP Connection',
      description: 'The target is accessible over plain HTTP without encryption. All data transmitted between the client and server (including credentials and session tokens) is transmitted in plaintext and can be intercepted.',
      affectedUrl: url,
      details: 'The site is served over HTTP, not HTTPS.',
      remediation: 'Redirect all HTTP traffic to HTTPS and obtain a valid TLS certificate. Configure HSTS afterwards.',
    });
  }

  // ── 5. Sensitive Paths / Debug Info in HTML ──────────────────────────────
  if (body) {
    // Check for common debug/error information leakage
    const errorPatterns = [
      { pattern: /stack trace/i, label: 'Stack trace' },
      { pattern: /at\s+\w+\.[\w<>]+\s*\(/i, label: 'Stack trace signatures' },
      { pattern: /mysql_error|mysqli_error|pg_get_error|sqlexception/i, label: 'Database error leak' },
      { pattern: /warning:\s+\w+\(\)/i, label: 'PHP warning' },
      { pattern: /fatal error/i, label: 'Fatal error message' },
    ];
    const foundLeaks: string[] = [];
    for (const ep of errorPatterns) {
      if (ep.pattern.test(body)) {
        foundLeaks.push(ep.label);
      }
    }
    if (foundLeaks.length > 0) {
      findings.push({
        type: 'information-disclosure',
        severity: 'high',
        title: 'Error / Debug Information Exposed in Response',
        description: `The page response contains debug information that can reveal internal implementation details: ${foundLeaks.join(', ')}. Attackers can use this to understand the application stack and exploit known vulnerabilities.`,
        affectedUrl: url,
        details: `Detected patterns: ${foundLeaks.join(', ')}`,
        remediation: 'Disable debug mode in production. Handle errors gracefully with custom error pages, and log errors server-side without exposing them to the user.',
      });
    }

    // Check for email addresses
    const emailMatch = body.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatch && emailMatch.length > 0) {
      const uniqueEmails = Array.from(new Set(emailMatch)).slice(0, 3);
      findings.push({
        type: 'information-disclosure',
        severity: 'low',
        title: 'Email Address Disclosure in HTML Source',
        description: `The page source contains exposed email addresses: ${uniqueEmails.join(', ')}. These can be harvested for phishing, spam, or social engineering attacks.`,
        affectedUrl: url,
        details: `Found emails: ${uniqueEmails.join(', ')}`,
        remediation: 'Obfuscate email addresses using JavaScript, CSS, or replace them with contact forms.',
      });
    }

    // Check for internal IP / private paths
    const ipPattern = /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/;
    if (ipPattern.test(body)) {
      const ipMatch = body.match(ipPattern);
      findings.push({
        type: 'information-disclosure',
        severity: 'medium',
        title: 'Internal IP Address Exposed in Response',
        description: `An internal/private IP address (${ipMatch ? ipMatch[0] : 'found'}) was found in the page response. This reveals internal network topology and can aid in further attacks.`,
        affectedUrl: url,
        details: `Internal IP found: ${ipMatch ? ipMatch[0] : 'Private network address'}`,
        remediation: 'Remove all references to internal IP addresses from public-facing responses. Use hostnames instead of IPs in configurations.',
      });
    }
  }

  // ── 6. Cache Control ─────────────────────────────────────────────────────
  const cacheControl = h('cache-control');
  const pragma = h('pragma');
  if (!cacheControl.includes('no-store') && !cacheControl.includes('private') && !pragma.includes('no-cache')) {
    findings.push({
      type: 'web',
      severity: 'low',
      title: 'Sensitive Page May Be Cached by Browsers / Proxies',
      description: 'The response does not set proper Cache-Control directives. If this page contains sensitive data, it may be stored in browser cache or intermediate proxy caches, potentially exposing it to other users sharing the same device or proxy.',
      affectedUrl: url,
      details: `Cache-Control: ${headers['cache-control'] || '(absent)'}, Pragma: ${headers['pragma'] || '(absent)'}`,
      remediation: 'For pages containing sensitive information, set: Cache-Control: no-store, no-cache, must-revalidate, Pragma: no-cache',
    });
  }

  // ── 7. Status-Code Specific Issues ──────────────────────────────────────
  if (statusCode === 200 && url.includes('/.git/') || body.includes('[core]') && body.includes('repositoryformatversion')) {
    findings.push({
      type: 'critical',
      severity: 'critical',
      title: 'Git Repository Exposed',
      description: 'A .git directory or repository file was discovered. This exposes the full source code history, credentials, and configuration files to unauthorized users.',
      affectedUrl: url,
      details: 'Git repository metadata found in web root.',
      remediation: 'Immediately remove the .git directory from the web server\'s public directory. Use .htaccess or server rules to block access to .git paths.',
    });
  }

  return findings;
}

/** ──────────────────────────────────────────────────────────────────────────
 *  httpxService
 * ──────────────────────────────────────────────────────────────────────────*/
export const httpxService = {
  async scan(url: string) {
    let statusCode: number | undefined;
    let headers: Record<string, any> = {};
    let body = '';

    // ── Attempt 1: HEAD request (lightweight) ─────────────────────────────
    try {
      const headRes = await axios.head(url, BASE_CONFIG);
      statusCode = headRes.status;
      headers = headRes.headers as Record<string, any>;
    } catch (headErr: any) {

      // ── Attempt 2: GET request (full body, parses title) ─────────────────
      try {
        const getRes = await axios.get(url, {
          ...BASE_CONFIG,
          maxContentLength: 512 * 1024,  // 512 KB cap
          responseType: 'text',
        });
        statusCode = getRes.status;
        headers = getRes.headers as Record<string, any>;
        body = typeof getRes.data === 'string' ? getRes.data : '';
      } catch (getErr: any) {
        // Both attempts failed — surface a clear error so scanner can catch it
        const msg = getErr.code === 'ECONNREFUSED'
          ? `Connection refused to ${url}`
          : getErr.code === 'ETIMEDOUT' || getErr.code === 'ECONNABORTED'
            ? `Request timed out for ${url}`
            : `Network error: ${getErr.message}`;

        throw new Error(msg);
      }
    }

    // ── If HEAD succeeded but we need a title + body for analysis, do a GET ─
    if (!body && statusCode && statusCode < 400) {
      try {
        const getRes = await axios.get(url, {
          ...BASE_CONFIG,
          maxContentLength: 512 * 1024,
          responseType: 'text',
        });
        body = typeof getRes.data === 'string' ? getRes.data : '';
        // Merge any extra headers from GET (HEAD might miss some)
        headers = { ...getRes.headers as Record<string, any>, ...headers };
      } catch (_) {
        // Body / title is nice-to-have for basic scan
      }
    }

    const title = extractTitle(body);
    const webserver = headers['server'] || headers['x-powered-by'] || 'Unknown';
    const contentType = headers['content-type'] || 'Unknown';

    return {
      isUp: statusCode !== undefined && statusCode < 500,
      statusCode: statusCode ?? 0,
      webserver,
      title,
      contentType,
      headers,
      body,
    };
  },

  /**
   * analyzeVulnerabilities — Used exclusively in shallow scan mode.
   * Runs a passive analysis of the HTTP response (headers + HTML body) and
   * returns 5-8 realistic security findings without requiring nmap/nikto.
   */
  async analyzeVulnerabilities(
    url: string,
    scanId: string,
  ): Promise<InsertVulnerability[]> {
    let statusCode = 0;
    let headers: Record<string, any> = {};
    let body = '';
    let title = '';

    try {
      const result = await this.scan(url);
      statusCode = result.statusCode;
      headers = result.headers;
      body = result.body;
      title = result.title;
    } catch {
      return [];
    }

    const raw = analyzeHeaders(url, statusCode, headers, body, title);

    // Convert to InsertVulnerability format and stamp the source tool
    return raw.map((f) => ({
      scanId,
      type: f.type,
      severity: f.severity,
      title: f.title,
      description: f.description,
      affectedUrl: f.affectedUrl,
      details: { rawDetails: f.details, sourceTool: 'Httpx' },
      remediation: f.remediation,
    } as InsertVulnerability));
  },
};
