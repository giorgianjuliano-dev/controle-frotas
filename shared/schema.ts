import { z } from "zod";
import { pgTable, text, integer, boolean, numeric, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export type VehicleStatus = "moving" | "stopped" | "idle" | "offline";
export type IgnitionStatus = "on" | "off";
export type AlertType = "speed" | "geofence_entry" | "geofence_exit" | "geofence_dwell" | "system";
export type AlertPriority = "critical" | "warning" | "info";
export type GeofenceType = "circle" | "polygon";
export type GeofenceRuleType = "entry" | "exit" | "dwell" | "time_violation";

export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  licensePlate: z.string(),
  model: z.string().optional(),
  status: z.enum(["moving", "stopped", "idle", "offline"]),
  ignition: z.enum(["on", "off"]),
  currentSpeed: z.number(),
  speedLimit: z.number(),
  heading: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  lastUpdate: z.string(),
  batteryLevel: z.number().optional(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const insertVehicleSchema = vehicleSchema.omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export const locationPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  timestamp: z.string(),
  accuracy: z.number().optional(),
  radius: z.number().optional(), // Raio em metros para exibir zona de parada
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

export const routeEventSchema = z.object({
  id: z.string(),
  type: z.enum(["departure", "arrival", "stop", "speed_violation", "geofence_entry", "geofence_exit"]),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),
  duration: z.number().optional(),
  speed: z.number().optional(),
  speedLimit: z.number().optional(),
  geofenceName: z.string().optional(),
  address: z.string().optional(),
});

export type RouteEvent = z.infer<typeof routeEventSchema>;

export const tripSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalDistance: z.number(),
  travelTime: z.number(),
  stoppedTime: z.number(),
  averageSpeed: z.number(),
  maxSpeed: z.number(),
  stopsCount: z.number(),
  points: z.array(locationPointSchema),
  events: z.array(routeEventSchema),
});

export type Trip = z.infer<typeof tripSchema>;

export const insertTripSchema = tripSchema.omit({ id: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;

export const geofenceRuleSchema = z.object({
  type: z.enum(["entry", "exit", "dwell", "time_violation"]),
  enabled: z.boolean(),
  dwellTimeMinutes: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  toleranceSeconds: z.number().optional(),
});

export type GeofenceRule = z.infer<typeof geofenceRuleSchema>;

export const geofenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["circle", "polygon"]),
  active: z.boolean(),
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  radius: z.number().optional(),
  points: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
  })).optional(),
  rules: z.array(geofenceRuleSchema),
  vehicleIds: z.array(z.string()),
  lastTriggered: z.string().optional(),
  color: z.string().optional(),
});

export type Geofence = z.infer<typeof geofenceSchema>;

export const insertGeofenceSchema = geofenceSchema.omit({ id: true });
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

export const alertSchema = z.object({
  id: z.string(),
  type: z.enum(["speed", "geofence_entry", "geofence_exit", "geofence_dwell", "system"]),
  priority: z.enum(["critical", "warning", "info"]),
  vehicleId: z.string(),
  vehicleName: z.string(),
  message: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  speed: z.number().optional(),
  speedLimit: z.number().optional(),
  geofenceName: z.string().optional(),
});

export type Alert = z.infer<typeof alertSchema>;

export const insertAlertSchema = alertSchema.omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export const speedViolationSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  vehicleName: z.string(),
  speed: z.number(),
  speedLimit: z.number(),
  excessSpeed: z.number(),
  timestamp: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  duration: z.number(),
});

export type SpeedViolation = z.infer<typeof speedViolationSchema>;

export const vehicleStatsSchema = z.object({
  totalViolations: z.number(),
  vehiclesWithViolations: z.number(),
  averageExcessSpeed: z.number(),
  violationsByDay: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
  topViolators: z.array(z.object({
    vehicleId: z.string(),
    vehicleName: z.string(),
    totalViolations: z.number(),
    averageExcessSpeed: z.number(),
    lastViolation: z.string(),
  })),
});

export type VehicleStats = z.infer<typeof vehicleStatsSchema>;

export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };

// Schema para dados de rastreamento (tracking)
export const trackingDataSchema = z.object({
  licensePlate: z.string().min(1, "Placa é obrigatória"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0),
});

export type TrackingData = z.infer<typeof trackingDataSchema>;

// ============================================
// Drizzle ORM Table Definitions for Supabase
// ============================================

export const vehiclesTable = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  licensePlate: text("license_plate").notNull(),
  model: text("model"),
  status: text("status").notNull().default("offline"),
  ignition: text("ignition").notNull().default("off"),
  currentSpeed: integer("current_speed").notNull().default(0),
  speedLimit: integer("speed_limit").notNull().default(80),
  heading: integer("heading").notNull().default(0),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: numeric("accuracy", { precision: 5, scale: 2 }).notNull().default("5"),
  lastUpdate: timestamp("last_update", { withTimezone: true }).notNull().defaultNow(),
  batteryLevel: integer("battery_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const geofencesTable = pgTable("geofences", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("circle"),
  active: boolean("active").notNull().default(true),
  center: jsonb("center").$type<{ latitude: number; longitude: number } | null>(),
  radius: numeric("radius", { precision: 10, scale: 2 }),
  points: jsonb("points").$type<Array<{ latitude: number; longitude: number }> | null>(),
  rules: jsonb("rules").$type<GeofenceRule[]>().notNull().default([]),
  vehicleIds: text("vehicle_ids").array().notNull().default([]),
  lastTriggered: timestamp("last_triggered", { withTimezone: true }),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertsTable = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  priority: text("priority").notNull(),
  vehicleId: text("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  speed: integer("speed"),
  speedLimit: integer("speed_limit"),
  geofenceName: text("geofence_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripsTable = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: text("vehicle_id").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  totalDistance: numeric("total_distance", { precision: 12, scale: 2 }).notNull(),
  travelTime: numeric("travel_time", { precision: 10, scale: 2 }).notNull(),
  stoppedTime: numeric("stopped_time", { precision: 10, scale: 2 }).notNull(),
  averageSpeed: numeric("average_speed", { precision: 6, scale: 2 }).notNull(),
  maxSpeed: numeric("max_speed", { precision: 6, scale: 2 }).notNull(),
  stopsCount: integer("stops_count").notNull().default(0),
  points: jsonb("points").$type<LocationPoint[]>().notNull().default([]),
  events: jsonb("events").$type<RouteEvent[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const speedViolationsTable = pgTable("speed_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: text("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  speed: integer("speed").notNull(),
  speedLimit: integer("speed_limit").notNull(),
  excessSpeed: integer("excess_speed").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  duration: integer("duration").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
