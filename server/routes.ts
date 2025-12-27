import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertVehicleSchema, insertGeofenceSchema, insertAlertSchema, trackingDataSchema, type LocationPoint } from "@shared/schema";

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
    console.error("[DEBUG] POST /api/geofences endpoint HIT - Body:", JSON.stringify(req.body));
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:130',message:'[H-D] POST /api/geofences called',data:{body:req.body,hasName:!!req.body?.name,hasType:!!req.body?.type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      console.error("[DEBUG] Calling storage.createGeofence");
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:132',message:'[H-B] Before storage.createGeofence',data:{payload:req.body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const geofence = await storage.createGeofence(req.body);
      console.error("[DEBUG] Geofence created successfully:", geofence.id);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:133',message:'[H-B] After storage.createGeofence SUCCESS',data:{geofenceId:geofence.id,name:geofence.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      res.status(201).json(geofence);
    } catch (error) {
      console.error("[DEBUG] Error creating geofence:", error);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:135',message:'[H-C] createGeofence FAILED',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:223',message:'[H-D] getTrips called',data:{query:req.query},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      const { vehicleId, startDate, endDate } = req.query;
      
      if (!vehicleId || typeof vehicleId !== "string") {
        return res.status(400).json({ error: "Vehicle ID is required" });
      }
      
      const start = startDate ? String(startDate) : new Date().toISOString();
      const end = endDate ? String(endDate) : new Date().toISOString();
      
      const trips = await storage.getTrips(vehicleId, start, end);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:236',message:'[H-D] getTrips result',data:{vehicleId,tripsCount:trips.length,hasPoints:trips[0]?.points?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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

  // ============================================
  // TRACKING ENDPOINT (para rastreadores GPS)
  // ============================================

  app.post("/api/tracking", async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/f9cb76f8-6507-4361-b279-2be2b44cfa69',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:273',message:'[H-A] Tracking endpoint called',data:{body:req.body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Validar API Key
      const apiKey = req.headers["x-api-key"];
      const expectedApiKey = process.env.TRACKING_API_KEY;

      if (!expectedApiKey) {
        console.error("TRACKING_API_KEY não configurada no ambiente");
        return res.status(500).json({ error: "API Key não configurada no servidor" });
      }

      if (!apiKey || apiKey !== expectedApiKey) {
        return res.status(401).json({ error: "API Key inválida ou não fornecida" });
      }

      // Validar payload
      const parsed = trackingDataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: parsed.error.errors 
        });
      }

      const { licensePlate, latitude, longitude, speed, heading, ignition, batteryLevel, timestamp } = parsed.data;
      const updateTime = timestamp || new Date().toISOString();

      // Buscar veículo pela placa
      let vehicle = await storage.getVehicleByPlate(licensePlate);

      if (vehicle) {
        // Atualizar veículo existente
        const currentIgnition = ignition || (speed > 0 ? "on" : vehicle.ignition);
        let status = speed > 0 ? "moving" : "stopped";
        
        if (currentIgnition === "on" && speed === 0) {
          status = "idle";
        }

        vehicle = await storage.updateVehicle(vehicle.id, {
          latitude,
          longitude,
          currentSpeed: speed,
          status,
          ignition: currentIgnition,
          heading: heading ?? vehicle.heading,
          batteryLevel: batteryLevel ?? vehicle.batteryLevel,
          lastUpdate: updateTime,
        });
      } else {
        // Criar novo veículo
        const currentIgnition = ignition || (speed > 0 ? "on" : "off");
        let status = speed > 0 ? "moving" : "stopped";
        
        if (currentIgnition === "on" && speed === 0) {
          status = "idle";
        }

        vehicle = await storage.createVehicle({
          name: `Veículo ${licensePlate}`,
          licensePlate,
          latitude,
          longitude,
          currentSpeed: speed,
          status,
          ignition: currentIgnition,
          speedLimit: 80,
          heading: heading || 0,
          accuracy: 5,
          lastUpdate: updateTime,
          batteryLevel: batteryLevel,
        });
      }

      // Salvar ponto no histórico de localizações
      if (vehicle) {
        const locationPoint: LocationPoint = {
          latitude,
          longitude,
          speed,
          heading: heading ?? vehicle.heading,
          timestamp: updateTime,
          accuracy: 5,
          radius: speed === 0 ? 1000 : undefined, // 1KM se parado
        };

        await storage.addLocationPoint(vehicle.id, locationPoint);

        // Detectar e salvar infração de velocidade
        if (speed > vehicle.speedLimit) {
          try {
            await storage.createSpeedViolation({
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              speed,
              speedLimit: vehicle.speedLimit,
              excessSpeed: speed - vehicle.speedLimit,
              latitude,
              longitude,
              duration: 10, // duração estimada em segundos
              timestamp: updateTime,
            });
            console.log(`[SPEED] Infração registrada: ${vehicle.name} a ${speed}km/h (limite: ${vehicle.speedLimit}km/h)`);
          } catch (violationError) {
            console.error("Erro ao registrar infração de velocidade:", violationError);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: "Posição atualizada com sucesso",
        vehicle,
      });
    } catch (error) {
      console.error("Erro no endpoint de tracking:", error);
      res.status(500).json({ error: "Falha ao processar dados de rastreamento" });
    }
  });

  return httpServer;
}
