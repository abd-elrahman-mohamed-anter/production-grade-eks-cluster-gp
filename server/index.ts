import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initScheduler } from "./scheduler";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    userId?: string;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Security Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Rate Limiting (100 requests per 15 minutes)
// Skip rate limiting for ZAP scanner requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Increased to 10,000 requests per 15 min
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => {
    // Skip rate limiting for ZAP scanner User-Agent
    const userAgent = req.get('user-agent') || '';
    return userAgent.toLowerCase().includes('zap');
  }
});
app.use(limiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Cleanup: Mark any scans that were "running" during a previous crash as "failed"
  log("Cleaning up stale scans...", "startup");
  await storage.resetActiveScans();

  // Initialize scheduler for scheduled scans
  initScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  let started = false;
  httpServer.listen(
    {
      port,
      host,
    },
    () => {
      if (started) return;
      started = true;
      log(`serving on host ${host} port ${port}`);
      const hostPort = process.env.HOST_PORT || port;
      console.log(`\x1b[33m[ZAP App]\x1b[0m Local:  http://localhost:${hostPort}`);
      console.log(`\x1b[33m[ZAP App]\x1b[32m domain is ready ✓\x1b[0m`);
    },
  );
})();
