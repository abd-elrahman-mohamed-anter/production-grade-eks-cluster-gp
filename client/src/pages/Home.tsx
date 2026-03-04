import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityTable from "@/components/ActivityTable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import type { Scan, Vulnerability } from "@shared/schema";

interface DashboardData {
  stats: {
    totalScans: number;
    totalVulnerabilities: number;
    criticalCount: number;
    lastScanTime: string;
  };
  recentScans: Scan[];
  weeklyData: { day: string; scans: number; vulnerabilities: number }[];
}

const severityColors = {
  Critical: "hsl(0, 85%, 45%)",
  High: "hsl(25, 85%, 50%)",
  Medium: "hsl(45, 85%, 50%)",
  Low: "hsl(180, 85%, 40%)",
};

export default function Home() {
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: allVulnerabilities } = useQuery<(Vulnerability & { targetUrl: string })[]>({
    queryKey: ["/api/vulnerabilities"],
  });

  const { data: recentScans, isLoading: scansLoading } = useQuery<Scan[]>({
    queryKey: ["/api/scans/recent"],
    queryFn: async () => {
      const response = await fetch("/api/scans/recent?limit=5", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch scans");
      return response.json();
    },
  });

  const [, setLocation] = useLocation();

  const handleViewSource = (id: string) => {
    setLocation(`/scans/${id}`);
  };

  if (dashboardLoading || scansLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-home">
        <h1 className="text-2xl font-semibold text-foreground">Welcome Home</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const stats = dashboard?.stats || { totalScans: 0, totalVulnerabilities: 0, criticalCount: 0, lastScanTime: "Never" };
  const weeklyData = dashboard?.weeklyData || [];

  const severityData = allVulnerabilities
    ? [
      { name: "Critical", value: allVulnerabilities.filter(v => v.severity === "critical").length, color: severityColors.Critical },
      { name: "High", value: allVulnerabilities.filter(v => v.severity === "high").length, color: severityColors.High },
      { name: "Medium", value: allVulnerabilities.filter(v => v.severity === "medium").length, color: severityColors.Medium },
      { name: "Low", value: allVulnerabilities.filter(v => v.severity === "low").length, color: severityColors.Low },
    ]
    : [];

  const recentFindings = (allVulnerabilities || [])
    .filter(v => v.severity !== 'info')
    .slice(0, 4)
    .map((v, i) => ({
      id: i + 1,
      type: v.type,
      severity: v.severity,
      target: v.targetUrl || v.affectedUrl,
    }));

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const resolvedPercent = stats.totalVulnerabilities > 0
    ? Math.round(((stats.totalVulnerabilities - stats.criticalCount) / stats.totalVulnerabilities) * 100)
    : 100;

  return (
    <div className="p-6 space-y-6" data-testid="page-home">
      <h1 className="text-2xl font-semibold text-foreground">Welcome Home</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalScans}</p>
              </div>
              <div className="flex items-center text-primary text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                Active
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vulnerabilities</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalVulnerabilities}</p>
              </div>
              {stats.totalVulnerabilities > 0 ? (
                <TrendingDown className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-foreground">{stats.criticalCount}</p>
              </div>
              <AlertTriangle className={`w-5 h-5 ${stats.criticalCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non-Critical</p>
                <p className="text-2xl font-bold text-foreground">{resolvedPercent}%</p>
              </div>
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e2e",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#fff", fontWeight: 600 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vulnerabilities" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No scan data yet. Start scanning to see activity.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Vulnerability Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.some(d => d.value > 0) ? (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={severityData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {severityData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1e2e",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        labelStyle={{ color: "#fff", fontWeight: 600 }}
                        itemStyle={{ color: "#e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {severityData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No vulnerabilities found yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Shield className="w-5 h-5 text-primary" />
            Recent Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFindings.length > 0 ? (
            <div className="space-y-3">
              {recentFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md bg-muted/50 border border-border"
                  data-testid={`finding-${finding.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(finding.severity) as "destructive" | "secondary"}>
                      {finding.severity}
                    </Badge>
                    <span className="font-medium text-foreground">{finding.type}</span>
                  </div>
                  <span className="font-mono text-sm text-muted-foreground truncate max-w-xs">
                    {finding.target}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No vulnerabilities found yet. Start a scan to see findings.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Scans</h2>
        <ActivityTable activities={(recentScans || []).slice(0, 5)} onViewSource={handleViewSource} />
      </div>
    </div>
  );
}
