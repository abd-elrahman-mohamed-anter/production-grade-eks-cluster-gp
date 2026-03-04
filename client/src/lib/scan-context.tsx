import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Scan } from "@shared/schema";

interface ScanContextType {
  activeScanId: string | null;
  setActiveScanId: (id: string | null) => void;
  activeScan: (Scan & { vulnerabilities: any[] }) | undefined;
  isScanning: boolean;
  isCanceling: boolean;
  setIsCanceling: (value: boolean) => void;
  estimatedRemainingSeconds?: number | null;
  isStalled: boolean;
  formattedETA?: string | null;
  displayedProgress: number;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [displayedProgress, setDisplayedProgress] = useState<number>(0);
  const [lastProgressUpdate, setLastProgressUpdate] = useState<number>(Date.now());
  const [isStalled, setIsStalled] = useState(false);

  const { data: activeScan } = useQuery<Scan & { vulnerabilities: any[] }>({
    queryKey: ["/api/scans", activeScanId],
    enabled: !!activeScanId,
    // keep polling while there's an active scan so progress updates even when user navigates away
    refetchInterval: () => {
      if (!activeScanId) return false;
      // poll every second while there is an active scan id
      return 1000;
    },
  });

  const isScanning = !!(activeScan && (activeScan.status === "running" || activeScan.status === "pending"));

  // Smoothly animate displayedProgress toward activeScan.progress
  useEffect(() => {
    const target = typeof (activeScan as any)?.progress === "number" ? (activeScan as any).progress : 0;
    
    // If target is less than displayed (e.g. new scan started or reset), snap immediately
    if (target < displayedProgress && target === 0) {
      setDisplayedProgress(target);
      return;
    }

    if (displayedProgress >= target) {
      return; // Don't animate backwards
    }

    let cancelled = false;
    const stepMs = 100; // Faster updates
    const handle = setInterval(() => {
      setDisplayedProgress((cur) => {
        if (cancelled) return cur;
        if (cur >= target) {
          clearInterval(handle);
          return target;
        }
        // Proportional step for faster catch-up
        const diff = target - cur;
        const step = Math.max(1, Math.ceil(diff / 10));
        return Math.min(target, cur + step);
      });
    }, stepMs);

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [activeScan?.progress]);

  // Update lastProgressUpdate for stall detection
  useEffect(() => {
    if (typeof activeScan?.progress === "number") {
      setLastProgressUpdate(Date.now());
      setIsStalled(false);
    }
  }, [activeScan?.progress]);

  const estimatedRemainingSeconds = (() => {
    if (!activeScan || activeScan.status !== "running" || !activeScan.startedAt) return null;
    
    const progress = (activeScan as any).progress;
    if (typeof progress !== "number" || progress <= 0 || progress >= 100) return null;

    const startTime = new Date(activeScan.startedAt).getTime();
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds < 5) return null;

    const rate = progress / elapsedSeconds; // avg percent per second
    if (rate <= 0) return null;

    const remainingPercent = 100 - progress;
    const seconds = remainingPercent / rate;
    
    return Math.round(seconds);
  })();

  // Check if progress hasn't moved for more than 15 seconds
  useEffect(() => {
    const checkStall = () => {
      const stalled = isScanning && (Date.now() - lastProgressUpdate > 30000); // Increased to 30s
      setIsStalled(stalled);
    };

    checkStall();
    const interval = setInterval(checkStall, 2000);
    return () => clearInterval(interval);
  }, [isScanning, lastProgressUpdate]);

  const formattedETA = (() => {
    if (estimatedRemainingSeconds === null || estimatedRemainingSeconds === undefined) {
      if (isScanning && (activeScan as any)?.progress > 0) return "Calculating...";
      return null;
    }
    const sec = estimatedRemainingSeconds;
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  })();

  return (
    <ScanContext.Provider
      value={{
        activeScanId,
        setActiveScanId,
        activeScan,
        isScanning,
        isCanceling,
        setIsCanceling,
        estimatedRemainingSeconds,
        isStalled,
        formattedETA,
        displayedProgress,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error("useScan must be used within ScanProvider");
  }
  return context;
}
