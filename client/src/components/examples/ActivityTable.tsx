import React, { useEffect, useState } from "react";
import ActivityTable from "../ActivityTable";

interface Scan {
  id: string;
  targetUrl: string;
  scanType: string;
  completedAt?: string;
  totalVulnerabilities?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
}

export default function ActivityTableExample() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScans = async () => {
    try {
      const res = await fetch("/api/scans/recent?limit=10");
      const data = await res.json();
      setScans(data);
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 5000); // تحديث كل 5 ثواني
    return () => clearInterval(interval);
  }, []);

  const handleViewSource = (id: string) => {
    console.log("View source for activity:", id);
    // هنا ممكن تفتح صفحة التفاصيل لكل scan
  };

  return (
    <div className="p-4">
      {loading ? (
        <p>Loading scans...</p>
      ) : scans.length === 0 ? (
        <p>No scans found.</p>
      ) : (
        <ActivityTable activities={scans} onViewSource={handleViewSource} />
      )}
    </div>
  );
}
