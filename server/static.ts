import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try to find the public directory in multiple common locations
  const pathsToCheck = [
    path.resolve(__dirname, "public"), // Standard local / relative to dist
    path.resolve(process.cwd(), "dist", "public"), // Vercel / Root relative
    path.resolve(process.cwd(), "public") // Fallback
  ];

  let distPath = "";
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.error(`Could not find build directory. Checked: ${pathsToCheck.join(", ")}`);
    // Fallback error handler for static routes
    app.use("*", (_req, res) => {
      res.status(500).type('text/html').send(`
        <h1>Deployment Error</h1>
        <p>Could not find static files.</p>
        <p>Checked paths:</p>
        <ul>${pathsToCheck.map(p => `<li>${p}</li>`).join('')}</ul>
      `);
    });
    return;
  }

  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
