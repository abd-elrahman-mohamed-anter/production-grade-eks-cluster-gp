import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Play, Loader2, CheckCircle, AlertTriangle, X, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useScan } from "@/lib/scan-context";
import type { Scan } from "@shared/schema";

import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ScanNow() {
  const [url, setUrl] = useState("");
  const { activeScanId, setActiveScanId, activeScan, isCanceling, setIsCanceling, formattedETA, displayedProgress, isStalled } = useScan();
  const { toast } = useToast();
  const [blockedTarget, setBlockedTarget] = useState<string | null>(null);
  const blockedDomains = ["youtube.com", "google.com", "facebook.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com"];

  // Watch url field and show the blocked panel immediately if the typed/selected URL is blocked
  useEffect(() => {
    if (!url) {
      setBlockedTarget(null);
      return;
    }
    const matches = blockedDomains.some(domain => url.includes(domain));
    setBlockedTarget(matches ? url : null);
  }, [url]);

  const { data: recentScans } = useQuery<Scan[]>({
    queryKey: ["/api/scans/recent"],
  });

  const { data: settings } = useQuery<{ scanDepth: string } | null>({
    queryKey: ["/api/settings"],
  });

  const [scanDepth, setScanDepth] = useState<string>("medium");

  useEffect(() => {
    if (settings && settings.scanDepth) setScanDepth(settings.scanDepth);
  }, [settings]);

  const persistSettingsMutation = useMutation({
    mutationFn: async (updates: any) => apiRequest("PATCH", "/api/settings", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (data: { targetUrl: string; scanType: string }) => {
      const response = await apiRequest("POST", "/api/scans", data);
      return response;
    },
    onSuccess: (scan: Scan) => {
      setActiveScanId(scan.id);
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Scan Started",
        description: `Scanning ${url} with ${scanDepth.charAt(0).toUpperCase() + scanDepth.slice(1)} scan...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to start the scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (scanId: string) => {
      // retry on 429 up to 3 attempts with exponential backoff
      const attempt = async (triesLeft: number, delayMs: number): Promise<any> => {
        try {
          return await apiRequest("POST", `/api/scans/${scanId}/cancel`, {});
        } catch (err: any) {
          const msg = err?.message || "";
          // crude check for 429 in message like "429: ..."
          if (triesLeft > 0 && /^429\b/.test(msg)) {
            // wait delayMs then retry
            await new Promise((res) => setTimeout(res, delayMs));
            return attempt(triesLeft - 1, delayMs * 2);
          }
          console.error("Cancel error:", err);
          throw err;
        }
      };

      return attempt(3, 1000);
    },
    onSuccess: () => {
      setIsCanceling(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scans", activeScanId] });
    },
    onError: (error: any) => {
      setIsCanceling(false);
      console.error("Mutation error:", error);
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel the scan.",
        variant: "destructive",
      });
    },
  });

  const handleStartScan = () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL to scan",
        variant: "destructive",
      });
      return;
    }

    let targetUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      targetUrl = "https://" + url;
    }

    // Block major platforms that cause timeouts/bans
    if (blockedDomains.some(domain => targetUrl.includes(domain))) {
      // show persistent in-page warning with a dismiss button and FAQ link
      setBlockedTarget(targetUrl);
      return;
    }

    // Use the selected scan depth as scanType (shallow|medium|deep)
    scanMutation.mutate({ targetUrl, scanType: scanDepth });
  };

  const handleCancelScan = () => {
    if (!activeScanId) return;
    setIsCanceling(true);
    // call mutation; the mutation function will handle retries for 429
    cancelMutation.mutate(activeScanId);
  };

  const recentUrls = Array.from(new Set((recentScans || []).map(s => s.targetUrl))).slice(0, 5);
  const isScanning = activeScan && (activeScan.status === "running" || activeScan.status === "pending");

  const [, setLocation] = useLocation();

  const [showHintPanel, setShowHintPanel] = useState(false);

  const openFaqForScanTypes = () => {
    setShowHintPanel(false);
    setLocation("/faq#scan-types");
  };

  const openAboutForTool = (toolHash: string) => {
    setShowHintPanel(false);
    setLocation(`/about#${toolHash}`);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6" data-testid="page-scan-now">
      <h1 className="text-2xl font-semibold text-foreground">Scan Now</h1>
      
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Start New Scan
          </CardTitle>
          <CardDescription>
            Enter the target URL to begin vulnerability assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="target-url">Target URL</Label>
            <div className="flex gap-2">
              <Input
                id="target-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12"
                data-testid="input-target-url"
              />
              <Button
                onClick={handleStartScan}
                disabled={isScanning || scanMutation.isPending}
                className="h-12 px-6"
                data-testid="button-start-scan"
              >
                {isScanning || scanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning with {(activeScan?.scanType || scanDepth).charAt(0).toUpperCase() + (activeScan?.scanType || scanDepth).slice(1)}...
                    </>
                  ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scan type selection - uses user settings and persists on change */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 relative">
              <Label>Scan Type</Label>
              <button
                aria-label="Open scan type details"
                onClick={() => setShowHintPanel((s) => !s)}
                className="rounded-full p-1 hover:bg-muted/50"
                title="Show scan type details"
              >
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
              </button>

              {showHintPanel && (
                <div className="absolute z-50 left-28 top-0 w-96 p-4 bg-popover border rounded shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold">Scan details</div>
                    <button onClick={() => setShowHintPanel(false)} className="text-muted-foreground hover:text-foreground">X</button>
                  </div>
                  <div className="mt-3 text-sm space-y-3">
                    {scanDepth === "shallow" && (
                      <div>
                        <p className="font-medium mb-1">🟦 Shallow - Quick Scan</p>
                        <div className="text-xs space-y-1">
                          <p>⏱️ <strong>Duration:</strong> 1-6:8 mins <span className="text-muted-foreground">(+ may increase depending on target)</span></p>
                          <p><strong>Tools:</strong></p>
                          <p>
                            ✓ <button onClick={() => openAboutForTool("httpx")} className="underline">Httpx</button>: basic reachability & header validation
                          </p>
                          <p>✗ Nmap: Disabled</p>
                          <p>✗ Nikto: Disabled</p>
                          <p>
                            ⚡ <button onClick={() => openAboutForTool("zap")} className="underline">ZAP</button>: shallow spider/quick checks
                          </p>
                          <p className="pt-2 italic">Best for: very quick smoke tests and CI-friendly checks</p>
                        </div>
                      </div>
                    )}
                    {scanDepth === "medium" && (
                      <div>
                        <p className="font-medium mb-1">⚖️ Medium - Standard Scan</p>
                        <div className="text-xs space-y-1">
                          <p>⏱️ <strong>Duration:</strong> 10-30:40 mins <span className="text-muted-foreground">(+ may increase depending on target)</span></p>
                          <p><strong>Tools:</strong></p>
                          <p>
                            ✓ <button onClick={() => openAboutForTool("httpx")} className="underline">Httpx</button>: validation + HTTP checks
                          </p>
                          <p>
                            📡 <button onClick={() => openAboutForTool("nmap")} className="underline">Nmap</button>: top ports (fast service detection)
                          </p>
                          <p>
                            📊 <button onClick={() => openAboutForTool("nikto")} className="underline">Nikto</button>: limited tuning/timeout for common checks
                          </p>
                          <p>
                            🔍 <button onClick={() => openAboutForTool("zap")} className="underline">ZAP</button>: standard spider + active tests
                          </p>
                          <p className="pt-2 italic">Best for: balanced scans suitable for staging environments</p>
                        </div>
                      </div>
                    )}
                    {scanDepth === "deep" && (
                      <div>
                        <p className="font-medium mb-1">🔐 Deep - Comprehensive Scan</p>
                        <div className="text-xs space-y-1">
                          <p>⏱️ <strong>Duration:</strong> 20-50+ mins <span className="text-muted-foreground">(+ may increase depending on target)</span></p>
            
                          <p><strong>Tools:</strong></p>
                          <p>
                            ✓ <button onClick={() => openAboutForTool("httpx")} className="underline">Httpx</button>: thorough validation
                          </p>
                          <p>
                            🔍 <button onClick={() => openAboutForTool("nmap")} className="underline">Nmap</button>: extensive port/service discovery
                          </p>
                          <p>
                            📋 <button onClick={() => openAboutForTool("nikto")} className="underline">Nikto</button>: full webserver checks
                          </p>
                          <p>
                            🔒 <button onClick={() => openAboutForTool("zap")} className="underline">ZAP</button>: deep spider + active scanning
                          </p>
                          <p className="pt-2 italic">Best for: full security audits and pre-release checks</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button onClick={openFaqForScanTypes} className="text-sm underline">Learn more about scan types (FAQ)</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={scanDepth} onValueChange={(v) => { setScanDepth(v); persistSettingsMutation.mutate({ scanDepth: v }); }}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shallow">Shallow - Quick scan (1-6:8 mins)</SelectItem>
                  <SelectItem value="medium">Medium - Standard scan (10-30:40 mins)</SelectItem>
                  <SelectItem value="deep">Deep - Comprehensive scan (20-50+ mins)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">Current: <span className="font-medium ml-1">{scanDepth}</span></div>
            </div>
          </div>

          {recentUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Recently Scanned</Label>
              <div className="flex flex-wrap gap-2">
                {recentUrls.map((recentUrl) => (
                  <Badge
                    key={recentUrl}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setUrl(recentUrl)}
                    data-testid={`badge-recent-${recentUrl.replace(/[^a-z0-9]/gi, '-')}`}
                  >
                    {recentUrl}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {blockedTarget && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="w-96 bg-destructive/10 border border-destructive/30 rounded-md p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-destructive">Target Not Supported</div>
                <div className="text-sm text-muted-foreground mt-1">Scanning major platforms (YouTube, Google, etc.) is not allowed as it causes timeouts and IP bans. Please scan your own applications.</div>
                <div className="mt-3">
                  <button onClick={() => setLocation("/faq#scan-blocked")} className="text-sm underline">Why is this blocked? Learn more</button>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button onClick={() => setBlockedTarget(null)} className="ml-2 text-muted-foreground hover:text-foreground">X</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeScan && (
        <Card className={`bg-card border-card-border ${activeScan.status === "running" || activeScan.status === "pending" || isCanceling ? "border-primary/50" : activeScan.status === "completed" ? "border-primary" : activeScan.status === "cancelled" ? "border-yellow-500/50" : "border-destructive"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeScan.status === "running" || activeScan.status === "pending" ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : activeScan.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : activeScan.status === "cancelled" || isCanceling ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              {isCanceling
                ? "Stopping Scan..."
                : activeScan.status === "running" || activeScan.status === "pending" 
                  ? `${activeScan.scanType ? activeScan.scanType.charAt(0).toUpperCase() + activeScan.scanType.slice(1) : "Unknown"} Scan in Progress` 
                  : activeScan.status === "completed" 
                    ? "Scan Completed"
                    : activeScan.status === "cancelled"
                      ? "Scan Cancelled"
                      : "Scan Failed"}
            </CardTitle>
            <CardDescription className="font-mono">{activeScan.targetUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            {(activeScan.status === "running" || activeScan.status === "pending") && (
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span>
                        Progress
                        {formattedETA ? (
                          <span className="ml-3 text-xs text-muted-foreground">Estimated: {formattedETA}</span>
                        ) : null}
                      </span>
                      <span>{displayedProgress}%</span>
                    </div>
                    <Progress value={displayedProgress} className="h-2" />
                    
                    {isStalled && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>This stage is complex and taking longer than usual. Please wait...</span>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-muted-foreground">
                      {displayedProgress === 0 && "Initializing..."}
                      {displayedProgress > 0 && displayedProgress <= 10 && "Validating Target (Httpx)"}
                      {displayedProgress > 10 && displayedProgress <= 25 && "Port Scanning (Nmap)"}
                      {displayedProgress > 25 && displayedProgress <= 40 && "Web Server Scanning (Nikto)"}
                      {displayedProgress > 40 && displayedProgress <= 95 && (
                        <>
                          {displayedProgress <= 55 && "🔍 ZAP: Spider crawling pages..."}
                          {displayedProgress > 55 && displayedProgress <= 70 && "🔐 ZAP: Testing low severity vulnerabilities..."}
                          {displayedProgress > 70 && displayedProgress <= 85 && "⚠️ ZAP: Deep scanning for medium vulnerabilities..."}
                          {displayedProgress > 85 && "🔴 ZAP: High severity scanning (may take longer)..."}
                        </>
                      )}
                      {displayedProgress > 95 && "Finalizing Results..."}
                    </div>
                  </div>
                  <Button
                    onClick={handleCancelScan}
                    disabled={isCanceling}
                    variant="destructive"
                    size="sm"
                    className="ml-4"
                  >
                    {isCanceling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Stop
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            {activeScan.status === "completed" && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-2xl font-bold text-foreground">{activeScan.totalVulnerabilities}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 bg-destructive/10 rounded-md">
                  <p className="text-2xl font-bold text-destructive">{activeScan.criticalCount}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="text-center p-3 bg-orange-500/10 rounded-md">
                  <p className="text-2xl font-bold text-orange-500">{activeScan.highCount}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 rounded-md">
                  <p className="text-2xl font-bold text-yellow-500">{activeScan.mediumCount}</p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-md">
                  <p className="text-2xl font-bold text-primary">{activeScan.lowCount}</p>
                  <p className="text-xs text-muted-foreground">Low</p>
                </div>
              </div>
            )}
            {activeScan.status === "cancelled" && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <p className="text-yellow-600 font-medium">Scan has been cancelled.</p>
              </div>
            )}
            
            {activeScan.vulnerabilities && activeScan.vulnerabilities.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Findings:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {activeScan.vulnerabilities.map((vuln: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-md border border-border"
                    >
                      <Badge 
                        variant={vuln.severity === "Critical" || vuln.severity === "High" ? "destructive" : "secondary"}
                        className="shrink-0"
                      >
                        {vuln.severity}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{vuln.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{vuln.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
