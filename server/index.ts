import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import * as fs from "fs";

// #region agent log
const debugLogPath = 'c:\\Users\\mathe\\OneDrive\\Desktop\\CLONE ADELITON\\controle-frotas\\.cursor\\debug.log';
try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:1',message:'[H-A] Server module loading',data:{nodeEnv:process.env.NODE_ENV,port:process.env.PORT},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})+'\n'); } catch(e){}
// #endregion

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
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

const setupPromise = (async () => {
  // #region agent log
  try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:63',message:'[H-A] Starting async initialization',data:{supabaseUrl:!!process.env.SUPABASE_URL,supabaseKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,storageType:process.env.STORAGE_TYPE},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})+'\n'); } catch(e){}
  // #endregion
  
  try {
    await registerRoutes(httpServer, app);
    // #region agent log
    try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:70',message:'[H-A] Routes registered successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})+'\n'); } catch(e){}
    // #endregion
  } catch (routeError: any) {
    // #region agent log
    try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:74',message:'[H-A] Error registering routes',data:{error:routeError?.message,stack:routeError?.stack?.slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})+'\n'); } catch(e){}
    // #endregion
    throw routeError;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      // #region agent log
      try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:96',message:'[H-E] Vite setup completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})+'\n'); } catch(e){}
      // #endregion
    } catch (viteError: any) {
      // #region agent log
      try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:100',message:'[H-E] Vite setup FAILED',data:{error:viteError?.message,stack:viteError?.stack?.slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})+'\n'); } catch(e){}
      // #endregion
      throw viteError;
    }
  }

  return app;
})();

if (process.env.VERCEL !== "1") {
  setupPromise.then(() => {
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    httpServer.on('error', (err: any) => {
      // #region agent log
      try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:114',message:'[H-D] HTTP Server error',data:{code:err?.code,message:err?.message,port},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})+'\n'); } catch(e){}
      // #endregion
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${port} já está em uso!`);
      }
    });
    
    httpServer.listen(port, () => {
      log(`serving on port ${port}`);
      // #region agent log
      try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'index.ts:124',message:'[H-A] Server listening successfully',data:{port},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})+'\n'); } catch(e){}
      // #endregion
    });
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  try {
    await setupPromise;
    app(req, res);
  } catch (err: any) {
    console.error("Critical error in Vercel function:", err);
    res.status(500).type('text/html').send(`
      <h1>Critical Server Error</h1>
      <pre>${err.message}</pre>
      <pre>${err.stack}</pre>
    `);
  }
};
