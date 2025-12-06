import { getSupabaseClient } from "./lib/supabase";
import type {
  Vehicle, InsertVehicle,
  Geofence, InsertGeofence, GeofenceRule,
  Alert, InsertAlert,
  Trip, SpeedViolation, VehicleStats,
  LocationPoint, RouteEvent
} from "@shared/schema";
import type { IStorage } from "./storage";

type VehicleUpdateCallback = (vehicles: Vehicle[]) => void;

// Tipos para os dados do banco
interface VehicleRow {
  id: string;
  name: string;
  license_plate: string;
  model: string | null;
  status: string;
  ignition: string;
  current_speed: number;
  speed_limit: number;
  heading: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  last_update: string;
  battery_level: number | null;
}

interface GeofenceRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  active: boolean;
  center: { latitude: number; longitude: number } | null;
  radius: number | null;
  points: Array<{ latitude: number; longitude: number }> | null;
  rules: unknown[];
  vehicle_ids: string[];
  last_triggered: string | null;
  color: string | null;
}

interface AlertRow {
  id: string;
  type: string;
  priority: string;
  vehicle_id: string;
  vehicle_name: string;
  message: string;
  timestamp: string;
  read: boolean;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  speed_limit: number | null;
  geofence_name: string | null;
}

interface TripRow {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string;
  total_distance: number;
  travel_time: number;
  stopped_time: number;
  average_speed: number;
  max_speed: number;
  stops_count: number;
  points: unknown[];
  events: unknown[];
}

interface SpeedViolationRow {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  speed: number;
  speed_limit: number;
  excess_speed: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  duration: number;
}

export class SupabaseStorage implements IStorage {
  private updateCallbacks: Set<VehicleUpdateCallback> = new Set();
  private supabase = getSupabaseClient();

  onVehicleUpdate(callback: VehicleUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private async notifyVehicleUpdate() {
    const vehicles = await this.getVehicles();
    this.updateCallbacks.forEach(cb => cb(vehicles));
  }

  // ============================================
  // VEHICLES
  // ============================================

  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(`Falha ao buscar veículos: ${error.message}`);
    }

    const rows = data as VehicleRow[] | null;
    return (rows || []).map(row => ({
      id: row.id,
      name: row.name,
      licensePlate: row.license_plate,
      model: row.model ?? undefined,
      status: row.status as Vehicle['status'],
      ignition: row.ignition as Vehicle['ignition'],
      currentSpeed: row.current_speed,
      speedLimit: row.speed_limit,
      heading: row.heading,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: Number(row.accuracy),
      lastUpdate: row.last_update,
      batteryLevel: row.battery_level ?? undefined,
    }));
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching vehicle:', error);
      throw new Error(`Falha ao buscar veículo: ${error.message}`);
    }

    const row = data as VehicleRow | null;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      licensePlate: row.license_plate,
      model: row.model ?? undefined,
      status: row.status as Vehicle['status'],
      ignition: row.ignition as Vehicle['ignition'],
      currentSpeed: row.current_speed,
      speedLimit: row.speed_limit,
      heading: row.heading,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: Number(row.accuracy),
      lastUpdate: row.last_update,
      batteryLevel: row.battery_level ?? undefined,
    };
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const { data, error } = await this.supabase
      .from('vehicles')
      .insert({
        name: vehicle.name,
        license_plate: vehicle.licensePlate,
        model: vehicle.model ?? null,
        status: vehicle.status,
        ignition: vehicle.ignition,
        current_speed: vehicle.currentSpeed,
        speed_limit: vehicle.speedLimit,
        heading: vehicle.heading,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        accuracy: vehicle.accuracy,
        last_update: vehicle.lastUpdate,
        battery_level: vehicle.batteryLevel ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      throw new Error(`Falha ao criar veículo: ${error.message}`);
    }

    const row = data as VehicleRow;
    await this.notifyVehicleUpdate();
    
    return {
      id: row.id,
      name: row.name,
      licensePlate: row.license_plate,
      model: row.model ?? undefined,
      status: row.status as Vehicle['status'],
      ignition: row.ignition as Vehicle['ignition'],
      currentSpeed: row.current_speed,
      speedLimit: row.speed_limit,
      heading: row.heading,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: Number(row.accuracy),
      lastUpdate: row.last_update,
      batteryLevel: row.battery_level ?? undefined,
    };
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.licensePlate !== undefined) updateData.license_plate = updates.licensePlate;
    if (updates.model !== undefined) updateData.model = updates.model ?? null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.ignition !== undefined) updateData.ignition = updates.ignition;
    if (updates.currentSpeed !== undefined) updateData.current_speed = updates.currentSpeed;
    if (updates.speedLimit !== undefined) updateData.speed_limit = updates.speedLimit;
    if (updates.heading !== undefined) updateData.heading = updates.heading;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
    if (updates.accuracy !== undefined) updateData.accuracy = updates.accuracy;
    if (updates.lastUpdate !== undefined) updateData.last_update = updates.lastUpdate;
    if (updates.batteryLevel !== undefined) updateData.battery_level = updates.batteryLevel ?? null;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error updating vehicle:', error);
      throw new Error(`Falha ao atualizar veículo: ${error.message}`);
    }

    const row = data as VehicleRow | null;
    if (!row) return undefined;

    await this.notifyVehicleUpdate();
    
    return {
      id: row.id,
      name: row.name,
      licensePlate: row.license_plate,
      model: row.model ?? undefined,
      status: row.status as Vehicle['status'],
      ignition: row.ignition as Vehicle['ignition'],
      currentSpeed: row.current_speed,
      speedLimit: row.speed_limit,
      heading: row.heading,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: Number(row.accuracy),
      lastUpdate: row.last_update,
      batteryLevel: row.battery_level ?? undefined,
    };
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error(`Falha ao deletar veículo: ${error.message}`);
    }

    await this.notifyVehicleUpdate();
    return true;
  }

  // ============================================
  // GEOFENCES
  // ============================================

  async getGeofences(): Promise<Geofence[]> {
    const { data, error } = await this.supabase
      .from('geofences')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching geofences:', error);
      throw new Error(`Falha ao buscar cercas virtuais: ${error.message}`);
    }

    const rows = data as GeofenceRow[] | null;
    return (rows || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as Geofence['type'],
      active: row.active,
      center: row.center ?? undefined,
      radius: row.radius ? Number(row.radius) : undefined,
      points: row.points ?? undefined,
      rules: (row.rules as GeofenceRule[]) || [],
      vehicleIds: row.vehicle_ids || [],
      lastTriggered: row.last_triggered ?? undefined,
      color: row.color ?? undefined,
    }));
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const { data, error } = await this.supabase
      .from('geofences')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching geofence:', error);
      throw new Error(`Falha ao buscar cerca virtual: ${error.message}`);
    }

    const row = data as GeofenceRow | null;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as Geofence['type'],
      active: row.active,
      center: row.center ?? undefined,
      radius: row.radius ? Number(row.radius) : undefined,
      points: row.points ?? undefined,
      rules: (row.rules as GeofenceRule[]) || [],
      vehicleIds: row.vehicle_ids || [],
      lastTriggered: row.last_triggered ?? undefined,
      color: row.color ?? undefined,
    };
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const { data, error } = await this.supabase
      .from('geofences')
      .insert({
        name: geofence.name,
        description: geofence.description ?? null,
        type: geofence.type,
        active: geofence.active,
        center: geofence.center ?? null,
        radius: geofence.radius ?? null,
        points: geofence.points ?? null,
        rules: geofence.rules,
        vehicle_ids: geofence.vehicleIds,
        last_triggered: geofence.lastTriggered ?? null,
        color: geofence.color ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating geofence:', error);
      throw new Error(`Falha ao criar cerca virtual: ${error.message}`);
    }

    const row = data as GeofenceRow;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as Geofence['type'],
      active: row.active,
      center: row.center ?? undefined,
      radius: row.radius ? Number(row.radius) : undefined,
      points: row.points ?? undefined,
      rules: (row.rules as GeofenceRule[]) || [],
      vehicleIds: row.vehicle_ids || [],
      lastTriggered: row.last_triggered ?? undefined,
      color: row.color ?? undefined,
    };
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description ?? null;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.center !== undefined) updateData.center = updates.center ?? null;
    if (updates.radius !== undefined) updateData.radius = updates.radius ?? null;
    if (updates.points !== undefined) updateData.points = updates.points ?? null;
    if (updates.rules !== undefined) updateData.rules = updates.rules;
    if (updates.vehicleIds !== undefined) updateData.vehicle_ids = updates.vehicleIds;
    if (updates.lastTriggered !== undefined) updateData.last_triggered = updates.lastTriggered ?? null;
    if (updates.color !== undefined) updateData.color = updates.color ?? null;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('geofences')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error updating geofence:', error);
      throw new Error(`Falha ao atualizar cerca virtual: ${error.message}`);
    }

    const row = data as GeofenceRow | null;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as Geofence['type'],
      active: row.active,
      center: row.center ?? undefined,
      radius: row.radius ? Number(row.radius) : undefined,
      points: row.points ?? undefined,
      rules: (row.rules as GeofenceRule[]) || [],
      vehicleIds: row.vehicle_ids || [],
      lastTriggered: row.last_triggered ?? undefined,
      color: row.color ?? undefined,
    };
  }

  async deleteGeofence(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('geofences')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting geofence:', error);
      throw new Error(`Falha ao deletar cerca virtual: ${error.message}`);
    }

    return true;
  }

  // ============================================
  // ALERTS
  // ============================================

  async getAlerts(): Promise<Alert[]> {
    const { data, error } = await this.supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      throw new Error(`Falha ao buscar alertas: ${error.message}`);
    }

    const rows = data as AlertRow[] | null;
    return (rows || []).map(row => ({
      id: row.id,
      type: row.type as Alert['type'],
      priority: row.priority as Alert['priority'],
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      message: row.message,
      timestamp: row.timestamp,
      read: row.read,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      speed: row.speed ?? undefined,
      speedLimit: row.speed_limit ?? undefined,
      geofenceName: row.geofence_name ?? undefined,
    }));
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const { data, error } = await this.supabase
      .from('alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching alert:', error);
      throw new Error(`Falha ao buscar alerta: ${error.message}`);
    }

    const row = data as AlertRow | null;
    if (!row) return undefined;

    return {
      id: row.id,
      type: row.type as Alert['type'],
      priority: row.priority as Alert['priority'],
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      message: row.message,
      timestamp: row.timestamp,
      read: row.read,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      speed: row.speed ?? undefined,
      speedLimit: row.speed_limit ?? undefined,
      geofenceName: row.geofence_name ?? undefined,
    };
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const { data, error } = await this.supabase
      .from('alerts')
      .insert({
        type: alert.type,
        priority: alert.priority,
        vehicle_id: alert.vehicleId,
        vehicle_name: alert.vehicleName,
        message: alert.message,
        timestamp: alert.timestamp,
        read: alert.read,
        latitude: alert.latitude ?? null,
        longitude: alert.longitude ?? null,
        speed: alert.speed ?? null,
        speed_limit: alert.speedLimit ?? null,
        geofence_name: alert.geofenceName ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      throw new Error(`Falha ao criar alerta: ${error.message}`);
    }

    const row = data as AlertRow;
    return {
      id: row.id,
      type: row.type as Alert['type'],
      priority: row.priority as Alert['priority'],
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      message: row.message,
      timestamp: row.timestamp,
      read: row.read,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      speed: row.speed ?? undefined,
      speedLimit: row.speed_limit ?? undefined,
      geofenceName: row.geofence_name ?? undefined,
    };
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.vehicleId !== undefined) updateData.vehicle_id = updates.vehicleId;
    if (updates.vehicleName !== undefined) updateData.vehicle_name = updates.vehicleName;
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.timestamp !== undefined) updateData.timestamp = updates.timestamp;
    if (updates.read !== undefined) updateData.read = updates.read;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude ?? null;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude ?? null;
    if (updates.speed !== undefined) updateData.speed = updates.speed ?? null;
    if (updates.speedLimit !== undefined) updateData.speed_limit = updates.speedLimit ?? null;
    if (updates.geofenceName !== undefined) updateData.geofence_name = updates.geofenceName ?? null;

    const { data, error } = await this.supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error updating alert:', error);
      throw new Error(`Falha ao atualizar alerta: ${error.message}`);
    }

    const row = data as AlertRow | null;
    if (!row) return undefined;

    return {
      id: row.id,
      type: row.type as Alert['type'],
      priority: row.priority as Alert['priority'],
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      message: row.message,
      timestamp: row.timestamp,
      read: row.read,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      speed: row.speed ?? undefined,
      speedLimit: row.speed_limit ?? undefined,
      geofenceName: row.geofence_name ?? undefined,
    };
  }

  async markAllAlertsRead(): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      console.error('Error marking alerts as read:', error);
      throw new Error(`Falha ao marcar alertas como lidos: ${error.message}`);
    }
  }

  async clearReadAlerts(): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .delete()
      .eq('read', true);

    if (error) {
      console.error('Error clearing read alerts:', error);
      throw new Error(`Falha ao limpar alertas lidos: ${error.message}`);
    }
  }

  // ============================================
  // TRIPS
  // ============================================

  async getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> {
    const { data, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      throw new Error(`Falha ao buscar viagens: ${error.message}`);
    }

    const rows = data as TripRow[] | null;
    return (rows || []).map(row => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      startTime: row.start_time,
      endTime: row.end_time,
      totalDistance: Number(row.total_distance),
      travelTime: Number(row.travel_time),
      stoppedTime: Number(row.stopped_time),
      averageSpeed: Number(row.average_speed),
      maxSpeed: Number(row.max_speed),
      stopsCount: row.stops_count,
      points: (row.points as LocationPoint[]) || [],
      events: (row.events as RouteEvent[]) || [],
    }));
  }

  // ============================================
  // SPEED VIOLATIONS
  // ============================================

  async getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]> {
    const { data, error } = await this.supabase
      .from('speed_violations')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching speed violations:', error);
      throw new Error(`Falha ao buscar violações de velocidade: ${error.message}`);
    }

    const rows = data as SpeedViolationRow[] | null;
    return (rows || []).map(row => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      speed: row.speed,
      speedLimit: row.speed_limit,
      excessSpeed: row.excess_speed,
      timestamp: row.timestamp,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      duration: row.duration,
    }));
  }

  async getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats> {
    const violations = await this.getSpeedViolations(startDate, endDate);

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
}
