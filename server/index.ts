  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    try {
      serveStatic(app);
    } catch (err: any) {
      console.error("Failed to setup static file serving:", err);
      // Do NOT throw here, so the API routes still work
      app.use("*", (_req, res) => {
        res.status(500).type('text/html').send(`
          <h1>Startup Error</h1>
          <p>Failed to setup static file serving.</p>
          <pre>${err.message}</pre>
        `);
      });
    }
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
  }).catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
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
