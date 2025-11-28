import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { 
  Calendar as CalendarIcon, Clock, MapPin, Gauge, 
  Route, Timer, PauseCircle, TrendingUp, Download,
  Flag, CheckCircle2, AlertTriangle, Shield, Play
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Vehicle, Trip, RouteEvent } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const startIcon = L.divIcon({
  html: `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#22c55e" stroke="white" stroke-width="2"/><path d="M11 16 L21 16 M16 11 L16 21" stroke="white" stroke-width="2"/></svg>`,
  className: "start-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = L.divIcon({
  html: `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/><rect x="11" y="11" width="10" height="10" fill="white"/></svg>`,
  className: "end-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const stopIcon = L.divIcon({
  html: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#f59e0b" stroke="white" stroke-width="2"/></svg>`,
  className: "stop-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function History() {
  const searchParams = new URLSearchParams(useSearch());
  const vehicleIdParam = searchParams.get("vehicleId");

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleIdParam || "");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedEvent, setSelectedEvent] = useState<RouteEvent | null>(null);

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: trips = [], isLoading: isLoadingTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips", selectedVehicleId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    enabled: !!selectedVehicleId,
  });

  const selectedTrip = trips[0];

  const quickFilters = [
    { label: "Hoje", days: 0 },
    { label: "Ontem", days: 1 },
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
  ];

  const handleQuickFilter = (days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(days === 0 ? new Date() : subDays(new Date(), days));
    setDateRange({ from, to });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getEventIcon = (type: RouteEvent["type"]) => {
    switch (type) {
      case "departure": return <Play className="h-4 w-4 text-green-500" />;
      case "arrival": return <CheckCircle2 className="h-4 w-4 text-red-500" />;
      case "stop": return <PauseCircle className="h-4 w-4 text-amber-500" />;
      case "speed_violation": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "geofence_entry":
      case "geofence_exit": return <Shield className="h-4 w-4 text-primary" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: RouteEvent["type"]) => {
    switch (type) {
      case "departure": return "Partida";
      case "arrival": return "Chegada";
      case "stop": return "Parada";
      case "speed_violation": return "Excesso de velocidade";
      case "geofence_entry": return "Entrada em geofence";
      case "geofence_exit": return "Saída de geofence";
      default: return "Evento";
    }
  };

  const routePositions = useMemo(() => {
    if (!selectedTrip?.points) return [];
    return selectedTrip.points.map(p => [p.latitude, p.longitude] as [number, number]);
  }, [selectedTrip]);

  const mapCenter = useMemo(() => {
    if (routePositions.length > 0) {
      return routePositions[Math.floor(routePositions.length / 2)];
    }
    return [-23.5505, -46.6333] as [number, number];
  }, [routePositions]);

  return (
    <div className="flex h-full" data-testid="history-page">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-[200px]" data-testid="select-vehicle">
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.licensePlate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <div className="flex gap-2">
              {quickFilters.map(filter => (
                <Button
                  key={filter.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(filter.days)}
                  data-testid={`filter-${filter.days}`}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {selectedTrip && (
              <Button variant="outline" className="gap-2 ml-auto" data-testid="button-export">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          {!selectedVehicleId ? (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center">
                <Route className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Selecione um veículo</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha um veículo e período para visualizar o histórico de trajetos
                </p>
              </div>
            </div>
          ) : isLoadingTrips ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !selectedTrip ? (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum trajeto encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Não há dados de trajeto para o período selecionado
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: "#3b82f6",
                    weight: 4,
                    opacity: 0.8,
                  }}
                />
              )}
              
              {routePositions.length > 0 && (
                <>
                  <Marker position={routePositions[0]} icon={startIcon}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-green-600">Partida</div>
                        <div>{format(new Date(selectedTrip.startTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker position={routePositions[routePositions.length - 1]} icon={endIcon}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-red-600">Chegada</div>
                        <div>{format(new Date(selectedTrip.endTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
              
              {selectedTrip.events
                .filter(e => e.type === "stop")
                .map((event, index) => (
                  <Marker
                    key={event.id}
                    position={[event.latitude, event.longitude]}
                    icon={stopIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-amber-600">Parada {index + 1}</div>
                        <div>Duração: {event.duration ? formatDuration(event.duration) : "N/A"}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {event.address || "Endereço não disponível"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          )}
        </div>
      </div>

      <div className="w-[380px] flex-shrink-0 border-l border-border bg-sidebar flex flex-col">
        {selectedTrip ? (
          <>
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="font-semibold text-lg mb-4">Resumo do Trajeto</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Route className="h-3 w-3" />
                      Distância
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDistance(selectedTrip.totalDistance)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Timer className="h-3 w-3" />
                      Tempo
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDuration(selectedTrip.travelTime)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <PauseCircle className="h-3 w-3" />
                      Parado
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDuration(selectedTrip.stoppedTime)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Gauge className="h-3 w-3" />
                      Vel. Média
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {Math.round(selectedTrip.averageSpeed)} km/h
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Vel. Máx
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {Math.round(selectedTrip.maxSpeed)} km/h
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <MapPin className="h-3 w-3" />
                      Paradas
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {selectedTrip.stopsCount}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-sidebar-border">
                <h3 className="font-medium">Eventos do Trajeto</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {selectedTrip.events.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={cn(
                        "w-full p-3 rounded-md text-left hover-elevate active-elevate-2",
                        selectedEvent?.id === event.id ? "bg-sidebar-accent" : "bg-card"
                      )}
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getEventLabel(event.type)}</span>
                            {event.type === "speed_violation" && event.speed && event.speedLimit && (
                              <Badge variant="destructive" className="text-[10px]">
                                {event.speed} / {event.speedLimit} km/h
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.timestamp), "HH:mm", { locale: ptBR })}
                            {event.duration && ` • ${formatDuration(event.duration)}`}
                          </div>
                          {event.address && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {event.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            {isLoadingVehicles || isLoadingTrips ? (
              <div className="space-y-4 w-full">
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecione um veículo e período para ver o resumo
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
