import React from "react";
import { Button } from "@/components/ui/button";

interface Scan {
  id: string;
  targetUrl: string;
  scanType: string;
  completedAt?: string | Date | null;
  startedAt?: string | Date | null;
  totalVulnerabilities?: number | null;
  criticalCount?: number | null;
  highCount?: number | null;
  mediumCount?: number | null;
  lowCount?: number | null;
}

interface ActivityTableProps {
  activities: Scan[];
  onViewSource: (id: string) => void;
}

export default function ActivityTable({ activities, onViewSource }: ActivityTableProps) {
  const severityColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-400",
    low: "bg-teal-400",
  };

  return (
    <table className="w-full border-collapse border border-gray-700">
      <thead>
        <tr className="bg-gray-800 text-left">
          <th className="p-2 border border-gray-600">#</th>
          <th className="p-2 border border-gray-600">Target</th>
          <th className="p-2 border border-gray-600">Type</th>
          <th className="p-2 border border-gray-600">Completed Date</th>
          <th className="p-2 border border-gray-600">Vulnerabilities</th>
          <th className="p-2 border border-gray-600">Action</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((scan, index) => {
          const total = scan.totalVulnerabilities || 0;
          const criticalPct = total ? (scan.criticalCount || 0) / total * 100 : 0;
          const highPct = total ? (scan.highCount || 0) / total * 100 : 0;
          const mediumPct = total ? (scan.mediumCount || 0) / total * 100 : 0;
          const lowPct = total ? (scan.lowCount || 0) / total * 100 : 0;

          return (
            <tr key={scan.id} className="hover:bg-gray-900">
              <td className="p-2 border border-gray-600">{index + 1}</td>
              <td className="p-2 border border-gray-600">{scan.targetUrl}</td>
              <td className="p-2 border border-gray-600 whitespace-nowrap">
                {scan.scanType ? (
                  scan.scanType.charAt(0).toUpperCase() + scan.scanType.slice(1)
                ) : (
                  "Unknown"
                )}
              </td>
              <td className="p-2 border border-gray-600 whitespace-nowrap">
                {scan.completedAt ? new Date(scan.completedAt).toLocaleString("en-US", { 
                  year: "numeric", 
                  month: "short", 
                  day: "numeric", 
                  hour: "2-digit", 
                  minute: "2-digit" 
                }) : "Pending"}
              </td>
              <td className="p-2 border border-gray-600">
                <div className="w-full h-4 bg-gray-700 rounded overflow-hidden flex">
                  {criticalPct > 0 && <div className={`${severityColors.critical} h-full`} style={{ width: `${criticalPct}%` }} title={`Critical: ${scan.criticalCount}`} />}
                  {highPct > 0 && <div className={`${severityColors.high} h-full`} style={{ width: `${highPct}%` }} title={`High: ${scan.highCount}`} />}
                  {mediumPct > 0 && <div className={`${severityColors.medium} h-full`} style={{ width: `${mediumPct}%` }} title={`Medium: ${scan.mediumCount}`} />}
                  {lowPct > 0 && <div className={`${severityColors.low} h-full`} style={{ width: `${lowPct}%` }} title={`Low: ${scan.lowCount}`} />}
                  {total === 0 && <span className="text-gray-400 text-xs">0</span>}
                </div>
              </td>
              <td className="p-2 border border-gray-600">
                <Button size="sm" onClick={() => onViewSource(scan.id)}>View Details</Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
