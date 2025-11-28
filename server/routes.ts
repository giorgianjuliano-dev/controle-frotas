import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertVehicleSchema, insertGeofenceSchema, insertAlertSchema } from "@shared/schema";

const clients = new Set<WebSocket>();

function broadcastVehicles(vehicles: unknown[]) {
  const message = JSON.stringify({ type: "vehicles", data: vehicles });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  storage.onVehicleUpdate(broadcastVehicles);

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("WebSocket client connected");

    storage.getVehicles().then(vehicles => {
      ws.send(JSON.stringify({ type: "vehicles", data: vehicles }));
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const parsed = insertVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid vehicle data", details: parsed.error.errors });
      }
      const vehicle = await storage.createVehicle(parsed.data);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const parsed = insertVehicleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid vehicle data", details: parsed.error.errors });
      }
      const vehicle = await storage.updateVehicle(req.params.id, parsed.data);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const success = await storage.deleteVehicle(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vehicle" });
    }
  });

  app.get("/api/geofences", async (req, res) => {
    try {
      const geofences = await storage.getGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch geofences" });
    }
  });

  app.get("/api/geofences/:id", async (req, res) => {
    try {
      const geofence = await storage.getGeofence(req.params.id);
      if (!geofence) {
        return res.status(404).json({ error: "Geofence not found" });
      }
      res.json(geofence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch geofence" });
    }
  });

  app.post("/api/geofences", async (req, res) => {
    try {
      const geofence = await storage.createGeofence(req.body);
      res.status(201).json(geofence);
    } catch (error) {
      res.status(500).json({ error: "Failed to create geofence" });
    }
  });

  app.patch("/api/geofences/:id", async (req, res) => {
    try {
      const geofence = await storage.updateGeofence(req.params.id, req.body);
      if (!geofence) {
        return res.status(404).json({ error: "Geofence not found" });
      }
      res.json(geofence);
    } catch (error) {
      res.status(500).json({ error: "Failed to update geofence" });
    }
  });

  app.delete("/api/geofences/:id", async (req, res) => {
    try {
      const success = await storage.deleteGeofence(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Geofence not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete geofence" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/:id", async (req, res) => {
    try {
      const alert = await storage.getAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alert = await storage.createAlert(req.body);
      res.status(201).json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.patch("/api/alerts/:id", async (req, res) => {
    try {
      const alert = await storage.updateAlert(req.params.id, req.body);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.post("/api/alerts/mark-all-read", async (req, res) => {
    try {
      await storage.markAllAlertsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alerts as read" });
    }
  });

  app.delete("/api/alerts/clear-read", async (req, res) => {
    try {
      await storage.clearReadAlerts();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear read alerts" });
    }
  });

  app.get("/api/trips", async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      
      if (!vehicleId || typeof vehicleId !== "string") {
        return res.status(400).json({ error: "Vehicle ID is required" });
      }
      
      const start = startDate ? String(startDate) : new Date().toISOString();
      const end = endDate ? String(endDate) : new Date().toISOString();
      
      const trips = await storage.getTrips(vehicleId, start, end);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/reports/violations", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate ? String(endDate) : new Date().toISOString();
      
      const violations = await storage.getSpeedViolations(start, end);
      res.json(violations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch violations" });
    }
  });

  app.get("/api/reports/speed-stats", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate ? String(endDate) : new Date().toISOString();
      
      const stats = await storage.getSpeedStats(start, end);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch speed stats" });
    }
  });

  return httpServer;
}
