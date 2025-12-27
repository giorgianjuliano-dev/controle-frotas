import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple paths to find the public directory
  const pathsToCheck = [
    path.resolve(__dirname, "public"), // Standard local / relative to dist
    path.resolve(process.cwd(), "dist", "public"), // Vercel / Root relative
    path.resolve(process.cwd(), "public") // Fallback
  ];

  let distPath = "";
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      distPath = p;
      console.log(`Found static files at: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    console.error(`Could not find build directory. Checked: ${pathsToCheck.join(", ")}`);
    // Instead of throwing, we setup a fallback route that explains the error
    // This prevents the "download" issue by returning text/html
    app.use("*", (_req, res) => {
      res.status(500).type('text/html').send(`
        <h1>Error: Static files not found</h1>
        <p>Could not locate the build directory.</p>
        <p>Checked paths:</p>
        <ul>${pathsToCheck.map(p => `<li>${p}</li>`).join('')}</ul>
        <p>Current Directory: ${process.cwd()}</p>
        <p>__dirname: ${__dirname}</p>
      `);
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
