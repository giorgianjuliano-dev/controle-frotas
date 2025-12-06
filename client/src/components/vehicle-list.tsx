import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Truck, MapPin, Gauge, AlertTriangle, Signal, SignalZero, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle, InsertVehicle } from "@shared/schema";

type FilterType = "all" | "moving" | "stopped" | "alerts" | "offline";

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
  isLoading?: boolean;
}

export function VehicleList({ vehicles, selectedVehicleId, onSelectVehicle, isLoading }: VehicleListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertVehicle>>({
    name: "",
    licensePlate: "",
    model: "",
    status: "offline",
    ignition: "off",
    currentSpeed: 0,
    speedLimit: 80,
    heading: 0,
    latitude: -23.5505,
    longitude: -46.6333,
    accuracy: 5,
    lastUpdate: new Date().toISOString(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo criado", description: "O novo veículo foi cadastrado com sucesso." });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o veículo.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      licensePlate: "",
      model: "",
      status: "offline",
      ignition: "off",
      currentSpeed: 0,
      speedLimit: 80,
      heading: 0,
      latitude: -23.5505,
      longitude: -46.6333,
      accuracy: 5,
      lastUpdate: new Date().toISOString(),
    });
  };

  const handleCreateSubmit = () => {
    if (!formData.name) {
      toast({ title: "Erro", description: "Digite um nome para o veículo.", variant: "destructive" });
      return;
    }
    if (!formData.licensePlate) {
      toast({ title: "Erro", description: "Digite a placa do veículo.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...formData,
      lastUpdate: new Date().toISOString(),
    } as InsertVehicle);
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: vehicles.length },
    { key: "moving", label: "Em Movimento", count: vehicles.filter(v => v.status === "moving").length },
    { key: "stopped", label: "Parados", count: vehicles.filter(v => v.status === "stopped" || v.status === "idle").length },
    { key: "alerts", label: "Alertas", count: vehicles.filter(v => v.currentSpeed > v.speedLimit).length },
    { key: "offline", label: "Offline", count: vehicles.filter(v => v.status === "offline").length },
  ];

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case "moving":
        return vehicle.status === "moving";
      case "stopped":
        return vehicle.status === "stopped" || vehicle.status === "idle";
      case "alerts":
        return vehicle.currentSpeed > vehicle.speedLimit;
      case "offline":
        return vehicle.status === "offline";
      default:
        return true;
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min`;
    return `${Math.floor(diffSeconds / 3600)}h`;
  };

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "bg-status-online";
      case "stopped": return "bg-status-away";
      case "idle": return "bg-status-away";
      case "offline": return "bg-status-offline";
    }
  };

  const getStatusLabel = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "Em Movimento";
      case "stopped": return "Parado";
      case "idle": return "Ocioso";
      case "offline": return "Offline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4">
          <div className="h-10 bg-muted animate-pulse rounded-md" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-vehicle"
            />
          </div>
          <Button 
            size="icon" 
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-vehicle"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors hover-elevate",
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              data-testid={`filter-${filter.key}`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum veículo encontrado</p>
            </div>
          ) : (
            filteredVehicles.map(vehicle => (
              <button
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle)}
                className={cn(
                  "w-full p-3 rounded-md text-left transition-colors hover-elevate active-elevate-2",
                  selectedVehicleId === vehicle.id
                    ? "bg-sidebar-accent"
                    : "bg-card"
                )}
                data-testid={`vehicle-item-${vehicle.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(vehicle.status))} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{vehicle.name}</span>
                      {vehicle.currentSpeed > vehicle.speedLimit && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">{vehicle.licensePlate}</div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        <span className={cn(
                          "font-mono font-medium",
                          vehicle.currentSpeed > vehicle.speedLimit && "text-destructive"
                        )}>
                          {vehicle.currentSpeed} km/h
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {vehicle.status === "offline" ? (
                          <SignalZero className="h-3 w-3" />
                        ) : (
                          <Signal className="h-3 w-3" />
                        )}
                        <span>{formatTime(vehicle.lastUpdate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {getStatusLabel(vehicle.status)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog de Criação de Veículo */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Veículo</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Caminhão 01"
                  data-testid="input-vehicle-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="licensePlate">Placa *</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate || ""}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Ex: ABC-1234"
                  data-testid="input-vehicle-plate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model || ""}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Mercedes Actros"
                  data-testid="input-vehicle-model"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speedLimit">Limite de Velocidade (km/h)</Label>
                <Input
                  id="speedLimit"
                  type="number"
                  value={formData.speedLimit || 80}
                  onChange={(e) => setFormData({ ...formData, speedLimit: parseInt(e.target.value) || 80 })}
                  min={20}
                  max={180}
                  data-testid="input-vehicle-speed-limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={formData.latitude || -23.5505}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || -23.5505 })}
                  data-testid="input-vehicle-latitude"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={formData.longitude || -46.6333}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || -46.6333 })}
                  data-testid="input-vehicle-longitude"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending} data-testid="button-save-vehicle">
              {createMutation.isPending ? "Salvando..." : "Criar Veículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
