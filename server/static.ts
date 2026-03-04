import type { Express } from "express";
import path from "path";
import express from "express";
import fs from "fs";

// Minimal static file serving for production builds.
// The client build output is placed in `dist/public` by the build script.
export function serveStatic(app: Express) {
  const clientDist = path.join(__dirname, "..", "dist", "public");

  if (!fs.existsSync(clientDist)) {
    // If the expected build output doesn't exist, fall back to the previous location
    // to avoid breaking deployments that used a different layout.
    const alt = path.join(__dirname, "..", "client", "dist");
    if (fs.existsSync(alt)) {
      console.warn(`[static] Using alternate client dist at ${alt}`);
      app.use(express.static(alt));
      app.get("*", (_req, res) => res.sendFile(path.join(alt, "index.html")));
      return;
    }

    console.warn(`[static] Client build output not found at ${clientDist} nor at ${alt}. Static serving disabled.`);
    return;
  }

  app.use(express.static(clientDist));

  // Fallback to index.html for SPA routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
 
