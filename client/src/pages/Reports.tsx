import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Search, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings, Report, Scan, Vulnerability } from "@shared/schema";

import { useLocation } from "wouter";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [scanTypeFilter, setScanTypeFilter] = useState("all");
  const [apiKey, setApiKey] = useState<string>("");
  const { toast } = useToast();

  const { data: settings } = useQuery<Settings & { apiKey: string }>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings?.apiKey) {
      setApiKey(settings.apiKey);
    }
  }, [settings]);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Report Deleted",
        description: "The scan report has been removed",
      });
    },
  });

  const filteredReports = (reports || []).filter((rep) => {
    const matchesSearch = rep.reportName.toLowerCase().includes(searchQuery.toLowerCase()) || (rep.reportPath || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScanType = scanTypeFilter === "all" || (rep as any).scanType === scanTypeFilter;
    return matchesSearch && matchesScanType;
  });

  const handleDownloadReport = (reportPath: string, format: string = "json") => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "API key not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    const url = `${reportPath}?format=${format}&apiKey=${encodeURIComponent(apiKey)}`;
    window.open(url, "_blank");
  };

  const handleDeleteReport = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-reports">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-reports">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Scan Reports
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-reports"
                />
              </div>
              <Select value={scanTypeFilter} onValueChange={setScanTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-scan-type-filter">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="shallow">Shallow Scans</SelectItem>
                  <SelectItem value="medium">Medium Scans</SelectItem>
                  <SelectItem value="deep">Deep Scans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {reports?.length === 0
                ? "No reports yet. Start a scan to see reports here."
                : "No reports match your search criteria."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Target / Report</TableHead>
                  <TableHead className="text-muted-foreground">Scan Type</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Total</TableHead>
                  <TableHead className="text-muted-foreground">Critical</TableHead>
                  <TableHead className="text-muted-foreground">High</TableHead>
                  <TableHead className="text-muted-foreground">Medium</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((rep) => (
                  <TableRow key={rep.id} className="border-border" data-testid={`report-row-${rep.id}`}>
                    <TableCell className="font-mono text-sm text-foreground max-w-xs">
                      <div className="truncate">
                        {rep.reportName
                          ? rep.reportName.replace(/\s*-\s*https?:\/\/.*$/i, "")
                          : "CyberShield Vulnerability Report"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 break-words max-w-xs truncate">
                        {(rep as any).targetUrl ? (rep as any).targetUrl : (rep.reportPath ?? "-")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{(rep as any).scanType ? (rep as any).scanType.charAt(0).toUpperCase() + (rep as any).scanType.slice(1) : "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rep.total ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rep.critical && rep.critical > 0 ? "destructive" : "secondary"}>{rep.critical ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rep.high && rep.high > 0 ? "destructive" : "secondary"}>{rep.high ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rep.medium && rep.medium > 0 ? "secondary" : "secondary"}>{rep.medium ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rep.scanId && setLocation(`/scans/${rep.scanId}`)}
                          data-testid={`button-view-report-${rep.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadReport(rep.reportPath, "html")}
                          data-testid={`button-download-report-${rep.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReport(rep.id)}
                          data-testid={`button-delete-report-${rep.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
