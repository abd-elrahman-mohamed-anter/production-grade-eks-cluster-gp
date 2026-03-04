import cron from "node-cron";
import { storage } from "./storage";
import { performScan, setScanAbortController } from "./scanner";
import { log } from "./index";

// Store active cron tasks
const activeTasks = new Map<string, cron.ScheduledTask>();

export function initScheduler() {
  log("Initializing scheduler...", "scheduler");

  // Check for scheduled scans every minute
  cron.schedule("* * * * *", async () => {
    try {
      const schedules = await storage.getAllScheduledScans();
      const now = new Date();

      // Concurrency Check: Don't start new scheduled scans if system is busy
      // Get all currently running scans
      const allScans = await storage.getAllScans();
      const runningScans = allScans.filter(s => s.status === "running" || s.status === "pending");
      if (runningScans.length >= 2) {
        log(`Skipping scheduled scans: System busy (${runningScans.length} active scans)`, "scheduler");
        return;
      }

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;

        let shouldRun = false;
        
        // Smart scheduling logic
        if (schedule.nextRun) {
            // If we have a next scheduled run time, check if we've passed it
            if (now >= new Date(schedule.nextRun)) {
                shouldRun = true;
            }
        } else {
            // No nextRun set (legacy or new). Determine if we should run.
            if (schedule.lastRun) {
                // Calculate when it SHOULD have run
                const expectedNext = calculateNextRun(schedule, new Date(schedule.lastRun));
                if (now >= expectedNext) {
                    shouldRun = true;
                } else {
                    // We haven't missed it, but we should set the nextRun to avoid recalculating
                    await storage.updateScheduledScan(schedule.id, {
                        nextRun: expectedNext
                    });
                }
            } else {
                // Never ran, run now
                shouldRun = true;
            }
        }

        // Log checking for debugging
        if (now.getSeconds() < 10) { 
             log(`Checking schedule ${schedule.id} for ${schedule.targetUrl}. NextRun: ${schedule.nextRun}, Now: ${now.toISOString()}. Should run: ${shouldRun}`, "scheduler");
        }
        
        if (shouldRun) {
          log(`Running scheduled scan for ${schedule.targetUrl}`, "scheduler");
          
          // Create and run scan
          const scan = await storage.createScan({
            userId: schedule.userId,
            targetUrl: schedule.targetUrl,
            scanType: "quick",
          });

          // Create and register AbortController before starting scan
          const abortController = new AbortController();
          setScanAbortController(scan.id, abortController);

          // Run scan asynchronously
          performScan(scan.id, schedule.targetUrl, "quick", abortController).catch(err => {
            log(`Scheduled scan failed: ${err.message}`, "scheduler");
          });

          // Calculate and update next run time
          // If we are catching up, we should calculate next run from NOW, or from the scheduled time?
          // Usually from NOW to avoid a loop of catch-ups if it's very frequent.
          // But to keep schedule aligned (e.g. every day at 10am), we might want to align with the target time.
          
          const nextRun = calculateNextRun(schedule, now);
          
          await storage.updateScheduledScan(schedule.id, {
            lastRun: now,
            nextRun: nextRun,
          });
        }
      }
    } catch (error) {
      log(`Scheduler error: ${error}`, "scheduler");
    }
  });

  log("Scheduler initialized", "scheduler");
}

function calculateNextRun(schedule: any, fromDate: Date): Date {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const nextRun = new Date(fromDate);
  
  // Set the time
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If the resulting time is in the past (e.g. we are calculating for "today" but it's already later),
  // we might need to advance, BUT the switch case below handles the advancing based on frequency.
  // However, we need to make sure we are finding the NEXT occurrence.
  
  // Let's assume we want the next occurrence AFTER fromDate.
  if (nextRun <= fromDate) {
      // Logic handled below to move to next period
  }

  switch (schedule.frequency) {
    case "daily":
      if (nextRun <= fromDate) {
          nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case "weekly":
      // schedule.dayOfWeek (0-6)
      if (schedule.dayOfWeek !== undefined && schedule.dayOfWeek !== null) {
          const currentDay = nextRun.getDay();
          const targetDay = schedule.dayOfWeek;
          let daysToAdd = (targetDay - currentDay + 7) % 7;
          
          if (daysToAdd === 0 && nextRun <= fromDate) {
              daysToAdd = 7;
          } else if (daysToAdd === 0 && nextRun > fromDate) {
              // It's today and in the future, keep it.
              daysToAdd = 0;
          } else if (nextRun <= fromDate) {
               // If adding daysToAdd still leaves us in past (unlikely if daysToAdd > 0), check
               // Wait, nextRun starts at today's date with target time.
               // If daysToAdd > 0, it moves to future.
          }
          nextRun.setDate(nextRun.getDate() + daysToAdd);
      } else {
          // Legacy weekly (just +7 days)
          if (nextRun <= fromDate) {
              nextRun.setDate(nextRun.getDate() + 7);
          }
      }
      break;
      
    case "monthly":
      // schedule.dayOfMonth (1-31)
      if (schedule.dayOfMonth) {
           // Move to current month's target day
           nextRun.setDate(schedule.dayOfMonth);
           // If passed, add month
           if (nextRun <= fromDate) {
               nextRun.setMonth(nextRun.getMonth() + 1);
           }
      } else {
          if (nextRun <= fromDate) {
             nextRun.setMonth(nextRun.getMonth() + 1);
          }
      }
      break;
      
    case "quarterly":
      if (schedule.dayOfMonth) {
           nextRun.setDate(schedule.dayOfMonth);
           if (nextRun <= fromDate) {
               nextRun.setMonth(nextRun.getMonth() + 3);
           }
      } else {
           if (nextRun <= fromDate) {
               nextRun.setMonth(nextRun.getMonth() + 3);
           }
      }
      break;
      
    case "annually":
      if (schedule.month !== undefined && schedule.month !== null) {
        nextRun.setMonth(schedule.month);
      }
      if (schedule.dayOfMonth) {
        nextRun.setDate(schedule.dayOfMonth);
      }
      
      // If the date we constructed is in the past, move to next year
      if (nextRun <= fromDate) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }
      break;
  }

  return nextRun;
}
