import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { initScheduler } from "./scheduler";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { storage } from "./storage";
import path from "path";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    userId?: string;
  }
}

// Middleware to parse JSON and URL-encoded
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ========== IMPORTANT FIXES FOR NGINX ==========

// Trust proxy - لازم جداً عشان Nginx
app.set('trust proxy', 1);

// CORS مفتوح بالكامل
app.use(cors({ 
  origin: true,  // اسمح بأي origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie']
}));

// منع HSTS - ده اللي كان بيسبب مشكلة HTTPS
app.use((req, res, next) => {
  // نشيل HSTS خالص عشان المتصفح يحولش لـ HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=0');
  
  // headers إضافية للأمان من غير HSTS
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  next();
});

// ==============================================

// Security Middleware - مع إعدادات مخصصة
app.use(helmet({
  hsts: false,  // نعطل HSTS نهائياً
  contentSecurityPolicy: false,  // نعطل CSP مؤقتاً
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Rate Limiting (Skip ZAP requests)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => {
    const userAgent = req.get('user-agent') || '';
    return userAgent.toLowerCase().includes('zap');
  },
  keyGenerator: (req) => {
    // استخدم X-Forwarded-For لو جاي من Nginx
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  }
});
app.use(limiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Logging helper
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logging for /api routes
app.use((req, res, next) => {
  const start = Date.now();
  const pathUrl = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathUrl.startsWith("/api")) {
      let logLine = `${req.method} ${pathUrl} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

(async () => {
  await registerRoutes(httpServer, app);

  // Cleanup stale scans
  log("Cleaning up stale scans...", "startup");
  await storage.resetActiveScans();

  // Initialize scheduler
  initScheduler();

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Error:", err);
  });

  // Serve frontend in production
  if (process.env.NODE_ENV === "production") {
    // خدمة الملفات الثابتة
    app.use(express.static(path.join(__dirname, '../dist')));
    
    // كل المسارات تروح لـ index.html (لـ SPA)
    app.get('*', (req, res) => {
      // لو الطلب للـ API، نتجاهل
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Listen on host 0.0.0.0 for production
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  let started = false;
  
  httpServer.listen({ port, host }, () => {
    if (started) return;
    started = true;
    log(`serving on host ${host} port ${port}`);
    const hostPort = process.env.HOST_PORT || port;
    console.log(`\x1b[33m[ZAP App]\x1b[0m Local:  http://localhost:${hostPort}`);
    console.log(`\x1b[33m[ZAP App]\x1b[32m domain is ready ✓\x1b[0m`);
  });
})();
