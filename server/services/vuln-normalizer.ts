import type { InsertVulnerability } from '@shared/schema';

/**
 * vuln-normalizer.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Solves three cross-tool reporting problems:
 *   1. Same vulnerability named differently by different tools
 *   2. Same vulnerability given different severity by different tools
 *   3. Duplicate entries when multiple tools find the same issue
 *
 * Strategy
 * ────────
 *   • VULN_CANONICAL_MAP  — maps every known tool-specific name variant to
 *     a single canonical title + CVSS-based severity + category type.
 *   • normalizeVulnerability()  — rewrites title/severity/type on a finding
 *     and stamps the source tool name into details.
 *   • deduplicateVulnerabilities()  — runs after normalization so that
 *     name/severity are already unified; deduplication key is
 *     (canonicalTitle + URL-hostname).  When two tools found the same thing
 *     their sourceTool strings are merged: "Httpx, ZAP".
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CanonicalEntry {
    /** The single agreed-upon display title */
    title: string;
    /** CVSS/OWASP-based severity (overrides whatever the tool said) */
    severity: SeverityLevel;
    /** Vulnerability category / type */
    type: string;
}

// ── Canonical Map ─────────────────────────────────────────────────────────
//
// Keys: lowercase substrings that appear in any tool's raw title.
//       The map is checked with String.includes() so partial matches work.
//       Order matters — more specific keys should come FIRST.
//
export const VULN_CANONICAL_MAP: Record<string, CanonicalEntry> = {

    // ── Clickjacking / X-Frame-Options ──────────────────────────────────────
    'anti-clickjacking': { title: 'Missing Anti-Clickjacking Header', severity: 'high', type: 'web' },
    'x-frame-options': { title: 'Missing Anti-Clickjacking Header', severity: 'high', type: 'web' },
    'clickjacking': { title: 'Missing Anti-Clickjacking Header', severity: 'high', type: 'web' },

    // ── Content-Security-Policy ──────────────────────────────────────────────
    'content-security-policy': { title: 'Missing Content-Security-Policy (CSP) Header', severity: 'high', type: 'web' },
    'content security policy': { title: 'Missing Content-Security-Policy (CSP) Header', severity: 'high', type: 'web' },

    // ── HSTS ────────────────────────────────────────────────────────────────
    'strict-transport-security': { title: 'Missing HTTP Strict Transport Security (HSTS)', severity: 'high', type: 'ssl-tls' },
    'strict transport security': { title: 'Missing HTTP Strict Transport Security (HSTS)', severity: 'high', type: 'ssl-tls' },
    'hsts': { title: 'Missing HTTP Strict Transport Security (HSTS)', severity: 'high', type: 'ssl-tls' },

    // ── X-Content-Type-Options ───────────────────────────────────────────────
    'x-content-type-options': { title: 'Missing X-Content-Type-Options Header', severity: 'medium', type: 'web' },
    'x content type options': { title: 'Missing X-Content-Type-Options Header', severity: 'medium', type: 'web' },
    'mime sniff': { title: 'Missing X-Content-Type-Options Header', severity: 'medium', type: 'web' },

    // ── Referrer-Policy ──────────────────────────────────────────────────────
    'referrer-policy': { title: 'Missing Referrer-Policy Header', severity: 'low', type: 'information-disclosure' },
    'referrer policy': { title: 'Missing Referrer-Policy Header', severity: 'low', type: 'information-disclosure' },

    // ── Permissions-Policy ───────────────────────────────────────────────────
    'permissions-policy': { title: 'Missing Permissions-Policy Header', severity: 'low', type: 'web' },
    'feature policy': { title: 'Missing Permissions-Policy Header', severity: 'low', type: 'web' },

    // ── Cookie Security ──────────────────────────────────────────────────────
    'cookie no httponly': { title: 'Insecure Cookie Configuration', severity: 'high', type: 'web' },
    'cookie without httponly': { title: 'Insecure Cookie Configuration', severity: 'high', type: 'web' },
    'cookie no secure': { title: 'Insecure Cookie Configuration', severity: 'high', type: 'web' },
    'insecure cookie': { title: 'Insecure Cookie Configuration', severity: 'high', type: 'web' },
    'samesite': { title: 'Insecure Cookie Configuration', severity: 'medium', type: 'web' },

    // ── CSRF ─────────────────────────────────────────────────────────────────
    'anti-csrf': { title: 'Missing Anti-CSRF Tokens', severity: 'high', type: 'web' },
    'csrf token': { title: 'Missing Anti-CSRF Tokens', severity: 'high', type: 'web' },
    'cross-site request forgery': { title: 'Missing Anti-CSRF Tokens', severity: 'high', type: 'web' },

    // ── XSS ──────────────────────────────────────────────────────────────────
    'cross-site scripting': { title: 'Cross-Site Scripting (XSS)', severity: 'high', type: 'web' },
    'reflected xss': { title: 'Cross-Site Scripting (XSS)', severity: 'high', type: 'web' },
    'stored xss': { title: 'Cross-Site Scripting (XSS)', severity: 'critical', type: 'web' },
    'dom xss': { title: 'Cross-Site Scripting (XSS)', severity: 'high', type: 'web' },

    // ── SQL Injection ─────────────────────────────────────────────────────────
    'sql injection': { title: 'SQL Injection', severity: 'critical', type: 'injection' },
    'sqli': { title: 'SQL Injection', severity: 'critical', type: 'injection' },

    // ── Open Redirect ─────────────────────────────────────────────────────────
    'open redirect': { title: 'Open Redirect Vulnerability', severity: 'medium', type: 'web' },

    // ── Directory Traversal / Path Disclosure ─────────────────────────────────
    'directory browsing': { title: 'Directory Listing Enabled', severity: 'medium', type: 'information-disclosure' },
    'directory listing': { title: 'Directory Listing Enabled', severity: 'medium', type: 'information-disclosure' },
    'path traversal': { title: 'Path Traversal Vulnerability', severity: 'high', type: 'information-disclosure' },

    // ── Server Version / Technology Disclosure ────────────────────────────────
    'server version': { title: 'Web Server Version Disclosure', severity: 'medium', type: 'information-disclosure' },
    'web server version': { title: 'Web Server Version Disclosure', severity: 'medium', type: 'information-disclosure' },
    'server banner': { title: 'Web Server Version Disclosure', severity: 'medium', type: 'information-disclosure' },
    'x-powered-by': { title: 'Technology Stack Disclosure via X-Powered-By', severity: 'medium', type: 'information-disclosure' },
    'powered-by': { title: 'Technology Stack Disclosure via X-Powered-By', severity: 'medium', type: 'information-disclosure' },
    'server technology': { title: 'Server Technology Disclosure', severity: 'low', type: 'information-disclosure' },
    'framework/language disclosure': { title: 'Technology Stack Disclosure via X-Powered-By', severity: 'medium', type: 'information-disclosure' },
    'framework disclosure': { title: 'Technology Stack Disclosure via X-Powered-By', severity: 'medium', type: 'information-disclosure' },

    // ── Information Disclosure (generic) ─────────────────────────────────────
    'information disclosure': { title: 'Sensitive Information Disclosure', severity: 'medium', type: 'information-disclosure' },
    'error information': { title: 'Error / Debug Information Exposed', severity: 'high', type: 'information-disclosure' },
    'debug information': { title: 'Error / Debug Information Exposed', severity: 'high', type: 'information-disclosure' },
    'stack trace': { title: 'Error / Debug Information Exposed', severity: 'high', type: 'information-disclosure' },
    'internal ip': { title: 'Internal IP Address Exposed', severity: 'medium', type: 'information-disclosure' },
    'private ip': { title: 'Internal IP Address Exposed', severity: 'medium', type: 'information-disclosure' },
    'email address disclosure': { title: 'Email Address Disclosure', severity: 'low', type: 'information-disclosure' },

    // ── TLS / SSL ─────────────────────────────────────────────────────────────
    'ssl/tls': { title: 'SSL/TLS Misconfiguration', severity: 'high', type: 'ssl-tls' },
    'ssl certificate': { title: 'SSL/TLS Misconfiguration', severity: 'high', type: 'ssl-tls' },
    'weak cipher': { title: 'Weak TLS Cipher Suite', severity: 'medium', type: 'ssl-tls' },
    'tls version': { title: 'Outdated TLS Version', severity: 'high', type: 'ssl-tls' },
    'unencrypted http': { title: 'Unencrypted HTTP Connection', severity: 'high', type: 'ssl-tls' },

    // ── Cache Control ─────────────────────────────────────────────────────────
    'cache-control': { title: 'Insecure Cache-Control Configuration', severity: 'low', type: 'web' },
    'sensitive page may be cached': { title: 'Insecure Cache-Control Configuration', severity: 'low', type: 'web' },
    'browser cach': { title: 'Insecure Cache-Control Configuration', severity: 'low', type: 'web' },  // matches "browser cache" or "browser caching"

    // ── Git / Source Code Exposure ────────────────────────────────────────────
    'git repository': { title: 'Git Repository Exposed', severity: 'critical', type: 'critical' },
    '.git': { title: 'Git Repository Exposed', severity: 'critical', type: 'critical' },

    // ── Open Ports ────────────────────────────────────────────────────────────
    'open port': { title: 'Open Ports Discovered', severity: 'low', type: 'network' },

};

// ── normalizeVulnerability ─────────────────────────────────────────────────

/**
 * Given a raw vulnerability (as produced by any tool) and the originating
 * tool name, returns a normalized copy with:
 *   • canonical title
 *   • canonical severity
 *   • canonical type
 *   • details.sourceTool  set to toolName
 *
 * If no canonical entry is found the original values are kept but
 * sourceTool is still stamped.
 */
export function normalizeVulnerability(
    vuln: InsertVulnerability,
    toolName: string,
): InsertVulnerability {
    const rawTitle = (vuln.title || '').toLowerCase();

    let canonical: CanonicalEntry | undefined;

    for (const [key, entry] of Object.entries(VULN_CANONICAL_MAP)) {
        if (rawTitle.includes(key)) {
            canonical = entry;
            break;
        }
    }

    // Merge sourceTool into details — keep any existing detail fields intact
    const existingDetails: Record<string, any> =
        typeof vuln.details === 'object' && vuln.details !== null
            ? (vuln.details as Record<string, any>)
            : {};

    const normalizedDetails = {
        ...existingDetails,
        sourceTool: toolName,
    };

    if (!canonical) {
        // No match — preserve original values, only stamp sourceTool
        return { ...vuln, details: normalizedDetails };
    }

    return {
        ...vuln,
        title: canonical.title,
        severity: canonical.severity,
        type: canonical.type,
        details: normalizedDetails,
    };
}

// ── deduplicateVulnerabilities ─────────────────────────────────────────────

/**
 * Remove duplicate vulnerabilities that were discovered by more than one tool.
 *
 * Must be called AFTER normalizeVulnerability() so that tool-specific name /
 * severity differences have already been resolved.
 *
 * Deduplication key: `canonicalTitle@@hostname`
 *
 * When a duplicate is found the second entry is dropped, but its sourceTool
 * value is merged into the first entry's details so the report can show
 * e.g. "Source Tool: Httpx, ZAP".
 */
export function deduplicateVulnerabilities(vulnerabilities: InsertVulnerability[]): {
    deduplicated: InsertVulnerability[];
    removedCount: number;
    duplicateInfo: Array<{ original: string; duplicates: number }>;
} {
    const seen = new Map<string, number>(); // key → index in `deduplicated`
    const deduplicated: InsertVulnerability[] = [];
    const duplicateInfo: Array<{ original: string; duplicates: number }> = [];
    let removedCount = 0;

    for (const vuln of vulnerabilities) {
        // Build a stable key ─ use hostname to avoid path-level false positives
        const hostname = safeHostname(vuln.affectedUrl || '');
        const key = `${(vuln.title || '').toLowerCase()}@@${hostname}`;

        const existingIndex = seen.get(key);

        if (existingIndex === undefined) {
            // First time we see this finding — keep it
            seen.set(key, deduplicated.length);
            deduplicated.push(vuln);
        } else {
            // Duplicate — merge sourceTool into the already-kept entry
            removedCount++;

            const origTitle = deduplicated[existingIndex].title || 'Unknown';
            const existingInfo = duplicateInfo.find(d => d.original === origTitle);
            if (existingInfo) {
                existingInfo.duplicates++;
            } else {
                duplicateInfo.push({ original: origTitle, duplicates: 1 });
            }

            // Merge source tool names (e.g., "Httpx" + "ZAP" → "Httpx, ZAP")
            const keptDetails = (deduplicated[existingIndex].details ?? {}) as Record<string, any>;
            const dupDetails = (vuln.details ?? {}) as Record<string, any>;

            const keptTool = keptDetails.sourceTool || 'Unknown';
            const dupTool = dupDetails.sourceTool || 'Unknown';

            if (dupTool && dupTool !== 'Unknown' && !keptTool.includes(dupTool)) {
                deduplicated[existingIndex] = {
                    ...deduplicated[existingIndex],
                    details: {
                        ...keptDetails,
                        sourceTool: `${keptTool}, ${dupTool}`,
                    },
                };
            }
        }
    }

    return { deduplicated, removedCount, duplicateInfo };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function safeHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url.toLowerCase().trim();
    }
}
