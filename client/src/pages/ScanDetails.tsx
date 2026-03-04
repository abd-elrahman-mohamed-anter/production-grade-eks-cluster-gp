import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2, CheckCircle, AlertTriangle, ArrowLeft, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { Scan, Vulnerability } from "@shared/schema";

export default function ScanDetails() {
  const [, params] = useRoute("/scans/:id");
  const id = params?.id;

  // We might fetch report first to get the scan ID, or directly scan if we have ID.
  // The route is /reports/:id, which likely refers to a REPORT ID based on the Reports page.
  // However, the Reports page lists REPORTS, but the "View Details" logic was fetching from export path which uses scanId?
  // Let's check Reports.tsx:
  // handleViewReport uses `reportPath` which is `/api/reports/export/<scanId>`.
  // So `id` here could be scanId if we link it that way. 
  // But standard restful would be /reports/:id (report id).
  // Let's assume we pass the SCAN ID or REPORT ID. 
  // If I change Reports.tsx to link to `/reports/${report.id}`, then I need to fetch report by ID.

  // Let's look at how to get report details. 
  // The server has `getReportsByUser` but no `getReportById` explicitly in the interface shown, 
  // but `storage.ts` has `getReportsByUser`. 
  // Wait, `Reports.tsx` uses `api/reports` to list.
  // And `handleViewReport` used `reportPath` to fetch details. `reportPath` was `/api/reports/export/${scanId}`.

  // To make it consistent, I should probably use `scanId`.
  // Let's change the route to `/scans/:id` which seems more appropriate for "Scan Details".
  // And in Reports page, we can link to `/scans/:scanId`.

  const { data: scanData, isLoading, error } = useQuery<Scan & { vulnerabilities: Vulnerability[] }>({
    queryKey: ["/api/scans", id],
    enabled: !!id,
    refetchInterval: (query: any) => {
      const data = query?.state?.data ?? query;
      if (data?.status === "running" || data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Scan Not Found</h1>
        </div>
        <p className="text-muted-foreground">The requested scan details could not be found.</p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const handleDownloadReport = (format: string) => {
    // We can use the export endpoint
    const url = `/api/reports/export/${scanData.id}?format=${format}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Scan Details</h1>
            <p className="text-sm text-muted-foreground font-mono">{scanData.targetUrl}</p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="uppercase text-xs font-semibold mr-2">Type:</span>
              <span className="font-medium">
                {scanData.scanType ? scanData.scanType.charAt(0).toUpperCase() + scanData.scanType.slice(1) : "Unknown"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleDownloadReport("json")}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" onClick={() => handleDownloadReport("html")}>
            <Download className="w-4 h-4 mr-2" />
            HTML
          </Button>
        </div>
      </div>

      <Card className={`bg-card border-card-border ${scanData.status === "running" ? "border-primary/50" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {scanData.status === "running" || scanData.status === "pending" ? (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  Scan in Progress
                </>
              ) : scanData.status === "completed" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Scan Completed
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Scan Failed
                </>
              )}
            </CardTitle>
            <Badge variant={scanData.status === "completed" ? "default" : "secondary"}>
              {scanData.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Started at {scanData.startedAt ? new Date(scanData.startedAt).toLocaleString() : "-"}
            {scanData.completedAt && ` • Completed at ${new Date(scanData.completedAt).toLocaleString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="findings" className="w-full">
            <TabsList>
              <TabsTrigger value="findings">Vulnerabilities</TabsTrigger>
              <TabsTrigger value="surface">Attack Surface (Vulnerable)</TabsTrigger>
            </TabsList>

            <TabsContent value="findings">
              {(scanData.status === "running" || scanData.status === "pending") && (() => {
                const progress = scanData.progress ?? 0;
                const getDetailedStage = (p: number) => {
                  if (p === 0) return "Initializing...";
                  if (p > 0 && p <= 10) return "Validating Target (Httpx)";
                  if (p > 10 && p <= 25) return "Port Scanning (Nmap)";
                  if (p > 25 && p <= 40) return "Web Server Scanning (Nikto)";
                  if (p > 40 && p <= 95) {
                    // Breaking down ZAP scanning into substages for better clarity
                    const zapProgress = p - 40; // 0-55%
                    if (zapProgress <= 15) return "🔍 ZAP: Spider crawling pages...";
                    if (zapProgress <= 30) return "🔐 ZAP: Testing low severity vulnerabilities...";
                    if (zapProgress <= 45) return "⚠️ ZAP: Deep scanning for medium vulnerabilities...";
                    return "🔴 ZAP: High severity scanning (may take longer)...";
                  }
                  if (p > 95) return "Finalizing Results...";
                  return "";
                };
                
                return (
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-end text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">Current Stage</span>
                        <span className="font-medium">
                          {getDetailedStage(progress)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })()}

              {scanData.status === "completed" && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted/50 rounded-md">
                    <p className="text-2xl font-bold text-foreground">{scanData.totalVulnerabilities}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 rounded-md">
                    <p className="text-2xl font-bold text-destructive">{scanData.criticalCount}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 rounded-md">
                    <p className="text-2xl font-bold text-orange-500">{scanData.highCount}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-500/10 rounded-md">
                    <p className="text-2xl font-bold text-yellow-500">{scanData.mediumCount}</p>
                    <p className="text-xs text-muted-foreground">Medium</p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-md">
                    <p className="text-2xl font-bold text-primary">{scanData.lowCount}</p>
                    <p className="text-xs text-muted-foreground">Low</p>
                  </div>
                  <div className="text-center p-3 bg-slate-500/10 rounded-md">
                    <p className="text-2xl font-bold text-slate-500">{(scanData as any).infoCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Info</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Vulnerabilities</h3>
                {!scanData.vulnerabilities || scanData.vulnerabilities.length === 0 ? (
                  <p className="text-muted-foreground italic">No vulnerabilities found yet.</p>
                ) : (
                  <div className="space-y-3">
                    {scanData.vulnerabilities.map((vuln, index) => (
                      <div
                        key={index}
                        className="p-4 bg-muted/30 rounded-md border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant={vuln.severity === "critical" || vuln.severity === "high" ? "destructive" : "secondary"}>
                            {vuln.severity.toUpperCase()}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{vuln.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{vuln.description}</p>
                            <p className="text-xs font-mono text-muted-foreground mt-2">
                              Affected: {vuln.affectedUrl}
                            </p>
                            {vuln.remediation && (
                              <p className="text-sm text-primary mt-2">
                                <strong>Fix:</strong> {vuln.remediation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="surface">
              <div className="p-4 border border-border rounded-md bg-muted/20">
                <h3 className="mb-4 font-semibold">Vulnerable Paths detected:</h3>
                <ul className="space-y-2 font-mono text-sm">
                  {Array.from(new Set(scanData.vulnerabilities?.map(v => v.affectedUrl) || [])).map((url, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

