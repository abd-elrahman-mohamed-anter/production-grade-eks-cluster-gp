import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock as ClockIcon } from "lucide-react";

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for Egypt (Africa/Cairo)
  const timeString = time.toLocaleTimeString("en-US", {
    timeZone: "Africa/Cairo",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateString = time.toLocaleDateString("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="bg-card border-card-border mb-6">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <ClockIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Current System Time (Egypt)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-wider text-foreground">
                {timeString}
              </span>
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {dateString}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
