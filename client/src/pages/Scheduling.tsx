import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Calendar, Plus, Clock, Trash2, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScheduledScan } from "@shared/schema";
import { FREQUENCY_OPTIONS as frequencyOptions, DAYS_OF_WEEK as daysOfWeek, MONTHS as months } from "@shared/schema";
import { Clock as SystemClock } from "@/components/Clock";

export default function Scheduling() {
  const [newUrl, setNewUrl] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("02:00");
  const [dayOfWeek, setDayOfWeek] = useState<string>("1"); // Default to Monday
  const [dayOfMonth, setDayOfMonth] = useState<string>("1"); // Default to 1st
  const [month, setMonth] = useState<string>("0"); // Default to January
  const { toast } = useToast();

  const { data: schedules, isLoading } = useQuery<ScheduledScan[]>({
    queryKey: ["/api/schedules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      targetUrl: string; 
      frequency: string; 
      time: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      month?: number;
    }) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setNewUrl("");
      toast({
        title: "Schedule Added",
        description: `Scheduled ${frequency} scan successfully`,
      });
    },
    onError: (error) => {
      console.error("Schedule creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScheduledScan> }) => {
      const response = await apiRequest("PATCH", `/api/schedules/${id}`, updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Schedule Removed",
        description: "Scheduled scan has been deleted",
      });
    },
  });

  const handleAddSchedule = () => {
    if (!newUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL to schedule",
        variant: "destructive",
      });
      return;
    }

    let targetUrl = newUrl;
    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
      targetUrl = "https://" + newUrl;
    }

    const payload: any = { targetUrl, frequency, time };
    
    if (frequency === "weekly") {
      payload.dayOfWeek = parseInt(dayOfWeek);
    } else if (["monthly", "quarterly", "annually"].includes(frequency)) {
      payload.dayOfMonth = parseInt(dayOfMonth);
      if (frequency === "annually") {
        payload.month = parseInt(month);
      }
    }

    createMutation.mutate(payload);
  };

  const handleToggleSchedule = (id: string, currentEnabled: boolean) => {
    updateMutation.mutate({ id, updates: { enabled: !currentEnabled } });
  };

  const handleDeleteSchedule = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-scheduling">
        <h1 className="text-2xl font-semibold text-foreground">Scheduling</h1>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-scheduling">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Scheduling</h1>
        <SystemClock />
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Schedule
          </CardTitle>
          <CardDescription>
            Set up automated scans to run at regular intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="schedule-url">Target URL</Label>
              <Input
                id="schedule-url"
                placeholder="https://example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                data-testid="input-schedule-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Regular</SelectLabel>
                    {frequencyOptions.filter(opt => opt.category === "Regular").map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Extended</SelectLabel>
                    {frequencyOptions.filter(opt => opt.category === "Extended").map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency === "annually" && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {["monthly", "quarterly", "annually"].includes(frequency) && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="schedule-time">Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="input-schedule-time"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddSchedule} 
            disabled={createMutation.isPending}
            data-testid="button-add-schedule"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Scheduled Scans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!schedules || schedules.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No scheduled scans. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md bg-muted/50 border border-border"
                  data-testid={`schedule-item-${schedule.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-foreground truncate">
                      {schedule.targetUrl}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {frequencyOptions.find(f => f.value === schedule.frequency)?.label || schedule.frequency}
                      </Badge>
                      {schedule.frequency === "weekly" && schedule.dayOfWeek !== null && (
                        <span className="text-xs text-muted-foreground">
                          on {daysOfWeek.find(d => d.value === schedule.dayOfWeek)?.label}
                        </span>
                      )}
                      {["monthly", "quarterly", "annually"].includes(schedule.frequency) && schedule.dayOfMonth !== null && (
                        <span className="text-xs text-muted-foreground">
                          on {schedule.frequency === "annually" && schedule.month !== null ? `${months.find(m => m.value === schedule.month)?.label} ` : ""}the {schedule.dayOfMonth}{schedule.dayOfMonth === 1 ? "st" : schedule.dayOfMonth === 2 ? "nd" : schedule.dayOfMonth === 3 ? "rd" : "th"}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        at {schedule.time}
                      </span>
                      {schedule.lastRun && (
                        <span className="text-xs text-muted-foreground">
                          Last run: {new Date(schedule.lastRun).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {schedule.enabled ? (
                        <Play className="w-4 h-4 text-primary" />
                      ) : (
                        <Pause className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={schedule.enabled ?? false}
                        onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.enabled ?? false)}
                        data-testid={`switch-schedule-${schedule.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      data-testid={`button-delete-schedule-${schedule.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
