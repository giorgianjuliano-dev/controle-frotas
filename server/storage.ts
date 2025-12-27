import { randomUUID } from "crypto";
import * as fs from "fs";
import type { 
  Vehicle, InsertVehicle,
  Geofence, InsertGeofence,
  Alert, InsertAlert,
  Trip, SpeedViolation, VehicleStats,
  LocationPoint, InsertSpeedViolation
} from "@shared/schema";

const debugLogPath = 'c:\\Users\\mathe\\OneDrive\\Desktop\\CLONE ADELITON\\controle-frotas\\.cursor\\debug.log';

type VehicleUpdateCallback = (vehicles: Vehicle[]) => void;

export interface IStorage {
  // Callback para atualizações de veículos em tempo real
  onVehicleUpdate(callback: VehicleUpdateCallback): () => void;
  
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByPlate(licensePlate: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  
  getGeofences(): Promise<Geofence[]>;
  getGeofence(id: string): Promise<Geofence | undefined>;
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined>;
  deleteGeofence(id: string): Promise<boolean>;
  
  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined>;
  markAllAlertsRead(): Promise<void>;
  clearReadAlerts(): Promise<void>;
  
  getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]>;
  addLocationPoint(vehicleId: string, point: LocationPoint): Promise<void>;
  
  getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]>;
  getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats>;
  createSpeedViolation(violation: InsertSpeedViolation): Promise<SpeedViolation>;
}

// Array vazio - veículos serão criados via API ou tracking
const sampleVehicles: Vehicle[] = [];

// Array vazio - geofences serão criadas via UI
const sampleGeofences: Geofence[] = [];

// Array vazio - alertas serão gerados pelo sistema
const sampleAlerts: Alert[] = [];

function generateSampleTrip(vehicleId: string, startDate: string, endDate: string): Trip {
  const vehicle = sampleVehicles.find(v => v.id === vehicleId);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const baseLat = -23.5505;
  const baseLng = -46.6333;
  
  const points: Trip["points"] = [];
  const events: Trip["events"] = [];
  
  let currentTime = new Date(start);
  currentTime.setHours(8, 0, 0, 0);
  const tripEnd = new Date(start);
  tripEnd.setHours(17, 0, 0, 0);
  
  let lat = baseLat;
  let lng = baseLng;
  let totalDistance = 0;
  let stoppedTime = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  
  events.push({
    id: randomUUID(),
    type: "departure",
    latitude: lat,
    longitude: lng,
    timestamp: currentTime.toISOString(),
    address: "Rua Augusta, 1234 - Consolação, São Paulo",
  });
  
  while (currentTime < tripEnd) {
    const speed = 30 + Math.random() * 50;
    const heading = Math.random() * 360;
    
    lat += (Math.random() - 0.5) * 0.01;
    lng += (Math.random() - 0.5) * 0.01;
    
    points.push({
      latitude: lat,
      longitude: lng,
      speed: Math.round(speed),
      heading: Math.round(heading),
      timestamp: currentTime.toISOString(),
      accuracy: 3 + Math.random() * 5,
    });
    
    totalDistance += speed * (5 / 60);
    if (speed > maxSpeed) maxSpeed = speed;
    totalSpeed += speed;
    speedCount++;
    
    if (Math.random() < 0.02 && speed > 65) {
      events.push({
        id: randomUUID(),
        type: "speed_violation",
        latitude: lat,
        longitude: lng,
        timestamp: currentTime.toISOString(),
        speed: Math.round(speed),
        speedLimit: 60,
      });
    }
    
    if (Math.random() < 0.01) {
      const stopDuration = 5 + Math.random() * 25;
      stoppedTime += stopDuration;
      events.push({
        id: randomUUID(),
        type: "stop",
        latitude: lat,
        longitude: lng,
        timestamp: currentTime.toISOString(),
        duration: stopDuration,
        address: `Rua ${Math.floor(Math.random() * 1000)}, São Paulo`,
      });
    }
    
    currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
  }
  
  events.push({
    id: randomUUID(),
    type: "arrival",
    latitude: lat,
    longitude: lng,
    timestamp: currentTime.toISOString(),
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo",
  });
  
  return {
    id: randomUUID(),
    vehicleId,
    startTime: new Date(start.setHours(8, 0, 0, 0)).toISOString(),
    endTime: currentTime.toISOString(),
    totalDistance: Math.round(totalDistance * 1000),
    travelTime: (tripEnd.getTime() - new Date(start.setHours(8, 0, 0, 0)).getTime()) / 60000 - stoppedTime,
    stoppedTime: Math.round(stoppedTime),
    averageSpeed: Math.round(totalSpeed / speedCount),
    maxSpeed: Math.round(maxSpeed),
    stopsCount: events.filter(e => e.type === "stop").length,
    points,
    events: events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  };
}

function generateSpeedViolations(startDate: string, endDate: string): SpeedViolation[] {
  const violations: SpeedViolation[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dailyViolations = 5 + Math.floor(Math.random() * 12);
    
    for (let i = 0; i < dailyViolations; i++) {
      const vehicle = sampleVehicles[Math.floor(Math.random() * sampleVehicles.length)];
      const speed = vehicle.speedLimit + 8 + Math.floor(Math.random() * 35);
      
      violations.push({
        id: randomUUID(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        speed,
        speedLimit: vehicle.speedLimit,
        excessSpeed: speed - vehicle.speedLimit,
        timestamp: new Date(d.getTime() + Math.random() * 86400000).toISOString(),
        latitude: -23.5 + Math.random() * 0.1,
        longitude: -46.6 + Math.random() * 0.1,
        duration: 15 + Math.floor(Math.random() * 90),
      });
    }
  }
  
  return violations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateSpeedStats(startDate: string, endDate: string): VehicleStats {
  const violations = generateSpeedViolations(startDate, endDate);
  
  const byVehicle = new Map<string, { count: number; totalExcess: number; lastViolation: string; name: string }>();
  
  violations.forEach(v => {
    const existing = byVehicle.get(v.vehicleId);
    if (existing) {
      existing.count++;
      existing.totalExcess += v.excessSpeed;
      if (new Date(v.timestamp) > new Date(existing.lastViolation)) {
        existing.lastViolation = v.timestamp;
      }
    } else {
      byVehicle.set(v.vehicleId, {
        count: 1,
        totalExcess: v.excessSpeed,
        lastViolation: v.timestamp,
        name: v.vehicleName,
      });
    }
  });
  
  const byDay = new Map<string, number>();
  violations.forEach(v => {
    const day = v.timestamp.split("T")[0];
    byDay.set(day, (byDay.get(day) || 0) + 1);
  });
  
  const topViolators = Array.from(byVehicle.entries())
    .map(([vehicleId, data]) => ({
      vehicleId,
      vehicleName: data.name,
      totalViolations: data.count,
      averageExcessSpeed: data.totalExcess / data.count,
      lastViolation: data.lastViolation,
    }))
    .sort((a, b) => b.totalViolations - a.totalViolations)
    .slice(0, 10);
  
  return {
    totalViolations: violations.length,
    vehiclesWithViolations: byVehicle.size,
    averageExcessSpeed: violations.length > 0 
      ? violations.reduce((sum, v) => sum + v.excessSpeed, 0) / violations.length 
      : 0,
    violationsByDay: Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topViolators,
  };
}

export class MemStorage implements IStorage {
  private vehicles: Map<string, Vehicle>;
  private geofences: Map<string, Geofence>;
  private alerts: Map<string, Alert>;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private updateCallbacks: Set<VehicleUpdateCallback> = new Set();

  constructor() {
    this.vehicles = new Map(sampleVehicles.map(v => [v.id, v]));
    this.geofences = new Map(sampleGeofences.map(g => [g.id, g]));
    this.alerts = new Map(sampleAlerts.map(a => [a.id, a]));
    
    this.startSimulation();
  }

  onVehicleUpdate(callback: VehicleUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyVehicleUpdate() {
    const vehicles = Array.from(this.vehicles.values());
    this.updateCallbacks.forEach(cb => cb(vehicles));
  }

  private startSimulation() {
    this.simulationInterval = setInterval(() => {
      this.vehicles.forEach((vehicle, id) => {
        if (vehicle.status === "moving") {
          const speedChange = (Math.random() - 0.5) * 10;
          let newSpeed = Math.max(0, Math.min(120, vehicle.currentSpeed + speedChange));
          
          const latChange = (Math.random() - 0.5) * 0.002;
          const lngChange = (Math.random() - 0.5) * 0.002;
          
          const headingChange = (Math.random() - 0.5) * 30;
          let newHeading = (vehicle.heading + headingChange + 360) % 360;
          
          this.vehicles.set(id, {
            ...vehicle,
            currentSpeed: Math.round(newSpeed),
            heading: Math.round(newHeading),
            latitude: vehicle.latitude + latChange,
            longitude: vehicle.longitude + lngChange,
            lastUpdate: new Date().toISOString(),
          });
        }
      });
      this.notifyVehicleUpdate();
    }, 3000);
  }

  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehicleByPlate(licensePlate: string): Promise<Vehicle | undefined> {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.licensePlate === licensePlate) {
        return vehicle;
      }
    }
    return undefined;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const newVehicle: Vehicle = { ...vehicle, id };
    this.vehicles.set(id, newVehicle);
    this.notifyVehicleUpdate();
    return newVehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    
    const updated = { ...vehicle, ...updates };
    this.vehicles.set(id, updated);
    this.notifyVehicleUpdate();
    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = this.vehicles.delete(id);
    if (result) this.notifyVehicleUpdate();
    return result;
  }

  async getGeofences(): Promise<Geofence[]> {
    return Array.from(this.geofences.values());
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    return this.geofences.get(id);
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const id = randomUUID();
    const newGeofence: Geofence = { ...geofence, id };
    this.geofences.set(id, newGeofence);
    return newGeofence;
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const geofence = this.geofences.get(id);
    if (!geofence) return undefined;
    
    const updated = { ...geofence, ...updates };
    this.geofences.set(id, updated);
    return updated;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    return this.geofences.delete(id);
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const newAlert: Alert = { ...alert, id };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    return updated;
  }

  async markAllAlertsRead(): Promise<void> {
    this.alerts.forEach((alert, id) => {
      this.alerts.set(id, { ...alert, read: true });
    });
  }

  async clearReadAlerts(): Promise<void> {
    this.alerts.forEach((alert, id) => {
      if (alert.read) {
        this.alerts.delete(id);
      }
    });
  }

  async getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> {
    // #region agent log
    const fs = require('fs');
    const logEntry = JSON.stringify({location:'storage.ts:612',message:'[H-C] MemStorage.getTrips called - returning SIMULATED data',data:{vehicleId,startDate,endDate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'}) + '\n';
    fs.appendFileSync('c:\\Users\\mathe\\OneDrive\\Desktop\\CLONE ADELITON\\controle-frotas\\.cursor\\debug.log', logEntry);
    // #endregion
    return [generateSampleTrip(vehicleId, startDate, endDate)];
  }

  async addLocationPoint(vehicleId: string, point: LocationPoint): Promise<void> {
    // MemStorage: armazena pontos em memória para desenvolvimento/testes
    // Em produção, use SupabaseStorage para persistência real
    console.log(`[MemStorage] Ponto de localização recebido para veículo ${vehicleId}:`, point);
  }

  async getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]> {
    return generateSpeedViolations(startDate, endDate);
  }

  async getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats> {
    return generateSpeedStats(startDate, endDate);
  }

  async createSpeedViolation(violation: InsertSpeedViolation): Promise<SpeedViolation> {
    // Implementação in-memory para desenvolvimento/testes
    const newViolation: SpeedViolation = {
      id: randomUUID(),
      ...violation,
    };
    return newViolation;
  }
}

import { isSupabaseConfigured } from "./lib/supabase";
import { SupabaseStorage } from "./supabase-storage";

// Função para criar o storage apropriado baseado na configuração
function createStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || 'memory';
  
  // #region agent log
  try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'storage.ts:635',message:'[H-C] Storage type being used',data:{storageType,supabaseConfigured:isSupabaseConfigured()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\n'); } catch(e){}
  // #endregion
  
  if (storageType === 'supabase') {
    if (!isSupabaseConfigured()) {
      console.warn(
        '⚠️  STORAGE_TYPE=supabase mas variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas. ' +
        'Usando armazenamento em memória.'
      );
      return new MemStorage();
    }
    console.log('✅ Usando Supabase como armazenamento');
    return new SupabaseStorage();
  }
  
  console.log('📦 Usando armazenamento em memória (dados simulados)');
  return new MemStorage();
}

export const storage = createStorage();
