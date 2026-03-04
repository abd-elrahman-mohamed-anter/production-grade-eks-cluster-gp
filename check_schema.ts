
import { insertScheduledScanSchema } from "./shared/schema";

const data = {
  targetUrl: "https://example.com",
  frequency: "daily",
  time: "02:00"
};

const result = insertScheduledScanSchema.safeParse(data);

if (result.success) {
} else {
}
