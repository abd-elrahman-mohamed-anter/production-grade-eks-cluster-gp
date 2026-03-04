import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle, AlertTriangle, MinusCircle, PlusCircle } from "lucide-react";
import type { Scan, Vulnerability } from "@shared/schema";

interface ScanWithVulns extends Scan {
    vulnerabilities: Vulnerability[];
}

export default function CompareScans() {
    const [scanAId, setScanAId] = useState<string>("");
    const [scanBId, setScanBId] = useState<string>("");

    const { data: scans } = useQuery<Scan[]>({
        queryKey: ["/api/scans"],
    });

    const { data: scanA } = useQuery<ScanWithVulns>({
        queryKey: ["/api/scans", scanAId],
        enabled: !!scanAId,
    });

    const { data: scanB } = useQuery<ScanWithVulns>({
        queryKey: ["/api/scans", scanBId],
        enabled: !!scanBId,
    });

    const getVulnHash = (v: Vulnerability) => `${v.title}-${v.affectedUrl}`;

    const getComparison = () => {
        if (!scanA || !scanB) return null;

        const vulnsA = scanA.vulnerabilities || [];
        const vulnsB = scanB.vulnerabilities || [];

        const setA = new Set(vulnsA.map(getVulnHash));
        const setB = new Set(vulnsB.map(getVulnHash));

        const newVulns = vulnsB.filter(v => !setA.has(getVulnHash(v)));
        const fixedVulns = vulnsA.filter(v => !setB.has(getVulnHash(v)));
        const ongoingVulns = vulnsB.filter(v => setA.has(getVulnHash(v)));

        return { newVulns, fixedVulns, ongoingVulns };
    };

    const comparison = getComparison();

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Compare Scans</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card border-card-border">
                    <CardHeader>
                        <CardTitle>Old Scan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={scanAId} onValueChange={setScanAId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Old Scan" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px] overflow-y-auto">
                                {scans?.slice(0, 15).map(scan => {
                                    const dateStr = new Date(scan.startedAt!).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    });
                                    return (
                                        <SelectItem key={scan.id} value={scan.id}>
                                            <span>[{dateStr}] · {scan.targetUrl}</span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        {scanA && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Critical:</span>
                                    <Badge variant="destructive">{scanA.criticalCount}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total:</span>
                                    <Badge variant="secondary">{scanA.totalVulnerabilities}</Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-card-border">
                    <CardHeader>
                        <CardTitle>New Scan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={scanBId} onValueChange={setScanBId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select New Scan" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px] overflow-y-auto">
                                {scans?.slice(0, 15).map(scan => {
                                    const dateStr = new Date(scan.startedAt!).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    });
                                    return (
                                        <SelectItem key={scan.id} value={scan.id}>
                                            <span>[{dateStr}] · {scan.targetUrl}</span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        {scanB && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Critical:</span>
                                    <Badge variant="destructive">{scanB.criticalCount}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total:</span>
                                    <Badge variant="secondary">{scanB.totalVulnerabilities}</Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {scanA && scanB && scanA.targetUrl !== scanB.targetUrl && (
                    <div className="p-4 border-l-4 border-yellow-500 bg-yellow-500/10 text-yellow-500 rounded-md flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm font-medium">Warning: You are comparing scans from different targets ({scanA.targetUrl} vs {scanB.targetUrl}). The comparison results may not be meaningful.</p>
                    </div>
                )}
            </div>

            {comparison && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-card border-card-border border-l-4 border-l-red-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-red-500" />
                                New Issues ({comparison.newVulns.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-y-auto">
                            <ul className="space-y-2">
                                {comparison.newVulns.map((v, i) => (
                                    <li key={i} className="text-sm p-2 bg-muted/40 rounded flex justify-between">
                                        <span className="truncate w-3/4">{v.title}</span>
                                        <Badge variant="outline">{v.severity}</Badge>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-card-border border-l-4 border-l-green-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                Fixed Issues ({comparison.fixedVulns.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-y-auto">
                            <ul className="space-y-2">
                                {comparison.fixedVulns.map((v, i) => (
                                    <li key={i} className="text-sm p-2 bg-muted/40 rounded flex justify-between">
                                        <span className="truncate w-3/4">{v.title}</span>
                                        <Badge variant="outline">{v.severity}</Badge>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-card-border border-l-4 border-l-yellow-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                Unresolved ({comparison.ongoingVulns.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-64 overflow-y-auto">
                            <ul className="space-y-2">
                                {comparison.ongoingVulns.map((v, i) => (
                                    <li key={i} className="text-sm p-2 bg-muted/40 rounded flex justify-between">
                                        <span className="truncate w-3/4">{v.title}</span>
                                        <Badge variant="outline">{v.severity}</Badge>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
