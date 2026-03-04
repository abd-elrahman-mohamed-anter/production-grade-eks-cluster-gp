import { storage } from "./storage";
import { zapClient } from "./zap-client";
import { httpxService } from "./services/httpx";
import { nmapService } from "./services/nmap";
import { niktoService } from "./services/nikto";
import { normalizeVulnerability, deduplicateVulnerabilities } from "./services/vuln-normalizer";
import type { InsertVulnerability } from "@shared/schema";

/**
 * Smoothly update progress from current to target value
 * Creates smooth animation of progress bar
 */
async function updateProgressSmooth(
  scanId: string,
  fromProgress: number,
  toProgress: number,
  durationMs: number,
  controller: AbortController
): Promise<void> {
  const steps = 20;
  const interval = durationMs / steps;
  const increment = (toProgress - fromProgress) / steps;

  let current = fromProgress;

  for (let i = 0; i <= steps; i++) {
    if (controller.signal.aborted) throw new Error("Scan cancelled by user");

    current = Math.min(fromProgress + increment * i, toProgress);
    await storage.updateScan(scanId, { progress: Math.round(current) });

    if (i < steps) {
      await new Promise(r => setTimeout(r, interval));
    }
  }

  await storage.updateScan(scanId, { progress: Math.round(toProgress) });
}

interface ScanResult {
  vulnerabilities: InsertVulnerability[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

// Map to store AbortControllers for active scans
const activeScanAbortControllers = new Map<string, AbortController>();
// Map to store progress intervals so we can smoothly increment progress per-scan
const activeProgressIntervals = new Map<string, NodeJS.Timeout>();

export function setScanAbortController(scanId: string, abortController: AbortController): void {
  activeScanAbortControllers.set(scanId, abortController);
}

// deduplicateVulnerabilities and normalizeVulnerability are now imported from
// ./services/vuln-normalizer — the old Levenshtein helpers have been removed.

export async function performScan(scanId: string, targetUrl: string, scanType: string, abortController?: AbortController): Promise<ScanResult> {
  const vulnerabilities: InsertVulnerability[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  let finalVulnerabilities: InsertVulnerability[] = [];
  let finalCriticalCount = 0;
  let finalHighCount = 0;
  let finalMediumCount = 0;
  let finalLowCount = 0;
  let finalInfoCount = 0;

  const controller = abortController || new AbortController();
  if (!abortController) {
    activeScanAbortControllers.set(scanId, controller);
  }

  const clearProgressInterval = () => {
    const it = activeProgressIntervals.get(scanId);
    if (it) {
      clearInterval(it);
      activeProgressIntervals.delete(scanId);
    }
  };

  const urlObj = new URL(targetUrl);
  const hostname = urlObj.hostname;

  try {
    await storage.updateScan(scanId, {
      status: "running",
      startedAt: new Date(),
      progress: 0
    });

    if (controller.signal.aborted) {
      throw new Error("Scan cancelled by user");
    }


    // --- Stage 1: Target Validation (Httpx) ---
    if (controller.signal.aborted) throw new Error("Scan cancelled by user");
    await updateProgressSmooth(scanId, 0, 10, 3000, controller);

    let targetValidated = false;
    let targetInfo: any = {};

    try {
      const httpxResult: any = await httpxService.scan(targetUrl);
      console.log(`[Scanner] 🔍 Httpx scan complete — status: ${httpxResult?.statusCode}, server: ${httpxResult?.webserver || 'unknown'}`);
      if (httpxResult && httpxResult.statusCode && httpxResult.statusCode < 500) {
        targetValidated = true;
        targetInfo = {
          status: httpxResult.statusCode,
          contentType: httpxResult.contentType || 'Unknown',
          server: httpxResult.webserver || 'Unknown',
          title: httpxResult.title || ''
        };
      }
    } catch (validationError: any) {
      console.warn(`[Scanner] Primary validation failed via Httpx: ${validationError.message}`);
    }

    if (!targetValidated) {
      console.warn(`[Scanner] ⚠️  Could not validate target ${targetUrl}, but continuing scan anyway...`);
      vulnerabilities.push({
        scanId,
        type: "info",
        severity: "info",
        title: "Target Pre-Validation Note",
        description: `Initial validation via Httpx was inconclusive. This does not necessarily mean the target is unreachable - scan will proceed.`,
        affectedUrl: targetUrl,
        details: { note: "Target might be blocking automated HTTP requests.", sourceTool: 'System' },
        remediation: "If scan finds vulnerabilities, this warning can be ignored."
      });
    } else if (targetInfo.server || targetInfo.title) {
      // Basic server info finding (always added)
      vulnerabilities.push({
        scanId,
        type: "info",
        severity: "info",
        title: "Server Information",
        description: `Web server: ${targetInfo.server || 'Unknown'} | Title: ${targetInfo.title || 'Unknown'}`,
        affectedUrl: targetUrl,
        details: { ...targetInfo, sourceTool: 'System' },
        remediation: "Information only."
      });
    }

    // --- Shallow Scan: HTTP Header & Response Vulnerability Analysis (httpx) ---
    if (scanType === "shallow") {
      try {
        const headerFindings = await httpxService.analyzeVulnerabilities(targetUrl, scanId);
        if (headerFindings.length > 0) {
          console.log(`[Scanner] ✅ Header analysis found ${headerFindings.length} finding(s)`);
          vulnerabilities.push(...headerFindings);
          for (const f of headerFindings) {
            switch (f.severity) {
              case "critical": criticalCount++; break;
              case "high": highCount++; break;
              case "medium": mediumCount++; break;
              case "low": lowCount++; break;
              case "info": infoCount++; break;
            }
          }
        } else {
          console.log(`[Scanner] ℹ️  No header vulnerabilities found`);
        }
      } catch (headerErr: any) {
        console.warn(`[Scanner] ⚠️  Shallow header analysis failed: ${headerErr.message}`);
      }
    }

    // --- Stage 2: Nmap (Skip for shallow scan) ---
    if (controller.signal.aborted) throw new Error("Scan cancelled by user");

    if (scanType === "shallow") {
      await updateProgressSmooth(scanId, 10, 30, 1000, controller);
    } else {

      let nmapDuration = scanType === "deep" ? 8000 : 4000;
      await updateProgressSmooth(scanId, 10, 30, nmapDuration, controller);

      try {
        console.log(`[Scanner] 🔍 Stage 2: Running Nmap on ${hostname}...`);
        const nmapResult = await nmapService.scan(hostname, scanType);

        if (nmapResult.openPorts.length > 0) {
          console.log(`[Scanner] ✅ Nmap found ${nmapResult.openPorts.length} open port(s)`);
          const portsDesc = nmapResult.openPorts.map(p => `${p.port}/${p.protocol} (${p.service})`).join(", ");
          vulnerabilities.push({
            scanId,
            type: "info",
            severity: "low",
            title: "Open Ports Discovered",
            description: `Nmap found the following open ports: ${portsDesc}`,
            affectedUrl: hostname,
            details: { rawOutput: nmapResult.rawOutput, sourceTool: 'Nmap' },
            remediation: "Ensure only necessary ports are exposed."
          });
          lowCount++;
        } else {
          console.log(`[Scanner] ℹ️  Nmap: no open ports found`);
        }
      } catch (nmapError: any) {
        console.warn(`[Scanner] ⚠️  Nmap failed: ${nmapError.message}, continuing scan...`);
      }
    }

    // --- Stage 3: Nikto (Skip for shallow scan) ---
    if (controller.signal.aborted) throw new Error("Scan cancelled by user");

    if (scanType === "shallow") {
      await updateProgressSmooth(scanId, 30, 45, 1000, controller);
    } else {

      let niktoDuration = scanType === "deep" ? 10000 : 3000;
      await updateProgressSmooth(scanId, 30, 45, niktoDuration, controller);

      try {
        console.log(`[Scanner] 🔍 Stage 3: Running Nikto on ${targetUrl}...`);
        const niktoResult = await niktoService.scan(targetUrl, scanType);

        for (const v of niktoResult.vulnerabilities) {
          vulnerabilities.push({
            scanId,
            type: "web",
            severity: "medium",
            title: `Nikto: ${v.msg.substring(0, 100)}...`,
            description: v.msg,
            affectedUrl: v.uri ? new URL(v.uri, targetUrl).toString() : targetUrl,
            details: { niktoId: v.id, method: v.method, sourceTool: 'Nikto' },
            remediation: "Check web server configuration."
          });
          mediumCount++;
        }

        if (niktoResult.vulnerabilities.length === 0) {
          console.log(`[Scanner] ℹ️  Nikto: no vulnerabilities found`);
        } else {
          console.log(`[Scanner] ✅ Nikto found ${niktoResult.vulnerabilities.length} issue(s)`);
        }
      } catch (niktoError: any) {
        console.warn(`[Scanner] ⚠️  Nikto failed: ${niktoError.message}, continuing scan...`);
      }
    }

    // --- Stage 4: OWASP ZAP (Always run, but with different settings) ---
    if (controller.signal.aborted) throw new Error("Scan cancelled by user");

    let zapResult: any = { vulnerabilities: [] };
    try {
      const zapReady = await zapClient.isReady(2, 500).catch(() => false);

      if (!zapReady) {
        console.warn(`[Scanner] ⚠️  ZAP daemon not accessible, skipping ZAP scan but continuing...`);
        await updateProgressSmooth(scanId, 45, 90, 2000, controller);
      } else {
        const startZapTime = Date.now();
        let lastZapProgress = 45;

        let expectedZapDuration: number;
        if (scanType === "shallow") {
          expectedZapDuration = 180000; // 3 minutes
        } else if (scanType === "deep") {
          expectedZapDuration = 7200000; // 120 minutes
        } else {
          expectedZapDuration = 600000; // 10 minutes
        }


        console.log(`[Scanner] 🔍 Stage 4: Running ZAP ${scanType} scan on ${targetUrl}...`);
        zapResult = await zapClient.performScan(targetUrl, scanType, async (progress) => {
          const elapsed = Date.now() - startZapTime;
          const mappedProgress = 45 + Math.floor((progress / 100) * 45);
          lastZapProgress = mappedProgress;

          await storage.updateScan(scanId, { progress: mappedProgress });

          const elapsedSeconds = Math.round(elapsed / 1000);
          const expectedSeconds = Math.round(expectedZapDuration / 1000);
          console.log(`[Scanner] ⏳ ZAP progress: ${progress}% (elapsed: ${elapsedSeconds}s / ~${expectedSeconds}s)`);
        }, controller.signal);
        console.log(`[Scanner] ✅ ZAP scan complete`);

        if (lastZapProgress < 90) {
          await updateProgressSmooth(scanId, lastZapProgress, 90, 2000, controller);
        }
      }
    } catch (zapError: any) {
      if (zapError.message === "Scan cancelled by user") {
        throw zapError;
      }
      console.warn(`[Scanner] ⚠️  ZAP scan error: ${zapError.message}, continuing with other results...`);
      zapResult = { vulnerabilities: [] };
      await updateProgressSmooth(scanId, 45, 90, 2000, controller);
    }

    const zapVulnerabilities = zapResult.vulnerabilities.map((vuln: any) => ({
      ...vuln,
      scanId,
      affectedUrl: vuln.affectedUrl || targetUrl,
    } as InsertVulnerability));

    vulnerabilities.push(...zapVulnerabilities);

    for (const vuln of zapVulnerabilities) {
      switch (vuln.severity) {
        case "critical": criticalCount++; break;
        case "high": highCount++; break;
        case "medium": mediumCount++; break;
        case "low": lowCount++; break;
        case "info": infoCount++; break;
      }
    }

    // --- Finalization: Normalize then Deduplicate ---

    // Step 1 — normalize: unify names, severities, and stamp sourceTool
    const normalizedVulnerabilities = vulnerabilities.map((v) =>
      normalizeVulnerability(v, ((v.details as any)?.sourceTool) || 'System')
    );

    // Step 2 — deduplicate (works on canonical titles, so cross-tool dupes are caught)
    const { deduplicated, removedCount, duplicateInfo } = deduplicateVulnerabilities(normalizedVulnerabilities);

    if (duplicateInfo.length > 0) {
      console.log(`[Scanner] 🧹 Removed ${removedCount} duplicate(s) after normalization`);
      for (const d of duplicateInfo) {
        console.log(`  - Duplicate: "${d}"`);
      }
    }

    finalVulnerabilities = deduplicated;

    for (const vuln of finalVulnerabilities) {
      switch (vuln.severity) {
        case "critical": finalCriticalCount++; break;
        case "high": finalHighCount++; break;
        case "medium": finalMediumCount++; break;
        case "low": finalLowCount++; break;
        case "info": finalInfoCount++; break;
      }
    }


    await updateProgressSmooth(scanId, 90, 100, 2000, controller);

    for (const vuln of finalVulnerabilities) {
      try {
        await storage.createVulnerability(vuln);
      } catch (err) {
        console.error("Failed to save vulnerability:", err);
      }
    }

    clearProgressInterval();
    await storage.updateScan(scanId, {
      status: "completed",
      completedAt: new Date(),
      totalVulnerabilities: finalVulnerabilities.length,
      criticalCount: finalCriticalCount,
      highCount: finalHighCount,
      mediumCount: finalMediumCount,
      lowCount: finalLowCount,
      infoCount: finalInfoCount,
      progress: 100
    });

    try {
      const saved = await storage.getScan(scanId);
      if (saved) {
        await storage.createReport({
          userId: saved.userId,
          scanId: saved.id,
          reportName: `CyberShield Vulnerability Report - ${saved.targetUrl}`,
          reportPath: `/api/reports/export/${scanId}`,
          createdAt: new Date(),
          total: finalVulnerabilities.length,
          critical: finalCriticalCount,
          high: finalHighCount,
          medium: finalMediumCount,
          low: finalLowCount,
          scanType: saved.scanType,
        } as any);
      }
    } catch (err) {
      console.error("Failed to create report entry:", err);
    }

  } catch (error: any) {
    if (error.message === "Scan cancelled by user") {
      activeScanAbortControllers.delete(scanId);
      clearProgressInterval();

      await storage.updateScan(scanId, {
        status: "cancelled",
        completedAt: new Date(),
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      });

      return {
        vulnerabilities: [],
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
      };
    }

    console.error(`[Scanner] ⚠️  Scan encountered error: ${error.message}`);
    // Also normalize + deduplicate in the error path
    const errorNormalized = vulnerabilities.map((v) =>
      normalizeVulnerability(v, ((v.details as any)?.sourceTool) || 'System')
    );
    const { deduplicated: errorDeduplicated } = deduplicateVulnerabilities(errorNormalized);

    let errorCriticalCount = 0;
    let errorHighCount = 0;
    let errorMediumCount = 0;
    let errorLowCount = 0;
    let errorInfoCount = 0;

    for (const vuln of errorDeduplicated) {
      switch (vuln.severity) {
        case "critical": errorCriticalCount++; break;
        case "high": errorHighCount++; break;
        case "medium": errorMediumCount++; break;
        case "low": errorLowCount++; break;
        case "info": errorInfoCount++; break;
      }
    }

    activeScanAbortControllers.delete(scanId);
    clearProgressInterval();

    await storage.updateScan(scanId, {
      status: "completed",
      completedAt: new Date(),
      totalVulnerabilities: errorDeduplicated.length,
      criticalCount: errorCriticalCount,
      highCount: errorHighCount,
      mediumCount: errorMediumCount,
      lowCount: errorLowCount,
      infoCount: errorInfoCount,
      progress: 100
    });

    for (const vuln of errorDeduplicated) {
      try {
        await storage.createVulnerability(vuln);
      } catch (err) {
        console.error('Failed to create vulnerability:', err);
      }
    }

    return {
      vulnerabilities: errorDeduplicated,
      criticalCount: errorCriticalCount,
      highCount: errorHighCount,
      mediumCount: errorMediumCount,
      lowCount: errorLowCount,
      infoCount: errorInfoCount,
    };
  }

  return {
    vulnerabilities: finalVulnerabilities,
    criticalCount: finalCriticalCount,
    highCount: finalHighCount,
    mediumCount: finalMediumCount,
    lowCount: finalLowCount,
    infoCount: finalInfoCount,
  };
}

export function cancelScan(scanId: string): boolean {
  const abortController = activeScanAbortControllers.get(scanId);
  if (abortController) {
    abortController.abort();
    return true;
  }
  return false;
}

export async function getLastScanTime(): Promise<string> {
  const scans = await storage.getRecentScans(1);
  if (scans.length === 0) {
    return "Never";
  }
  const lastScan = scans[0];
  if (lastScan.completedAt) {
    const diff = Date.now() - new Date(lastScan.completedAt).getTime();
    if (diff < 60000) return "Just Now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(lastScan.completedAt).toLocaleDateString();
  }
  return "In Progress";
}
