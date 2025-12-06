import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  X, MapPin, Gauge, Navigation, Radio, Battery, Clock, 
  History, Shield, AlertTriangle, Bell, Activity, Settings,
  Edit2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle, Alert } from "@shared/schema";
import { Link } from "wouter";

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  alerts: Alert[];
  onClose: () => void;
  onFollowVehicle: () => void;
  isFollowing: boolean;
}

export function VehicleDetailPanel({ vehicle, alerts, onClose, onFollowVehicle, isFollowing }: VehicleDetailPanelProps) {
  const { toast } = useToast();
  const vehicleAlerts = alerts.filter(a => a.vehicleId === vehicle.id);
  const unreadAlerts = vehicleAlerts.filter(a => !a.read);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: vehicle.name,
    licensePlate: vehicle.licensePlate,
    model: vehicle.model || "",
    speedLimit: vehicle.speedLimit,
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
  });

  // Atualizar formData quando vehicle mudar
  useEffect(() => {
    setFormData({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate,
      model: vehicle.model || "",
      speedLimit: vehicle.speedLimit,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
    });
  }, [vehicle]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicle.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo atualizado", description: "As alterações foram salvas com sucesso." });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o veículo.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/vehicles/${vehicle.id}`);
    },
    onSuccess: () => {
      // Primeiro fecha o painel e o dialog antes de invalidar a query
      // para evitar renderização com dados inconsistentes
      onClose();
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo excluído", description: "O veículo foi removido com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o veículo.", variant: "destructive" });
    },
  });

  const handleEditSubmit = () => {
    if (!formData.name) {
      toast({ title: "Erro", description: "Digite um nome para o veículo.", variant: "destructive" });
      return;
    }
    if (!formData.licensePlate) {
      toast({ title: "Erro", description: "Digite a placa do veículo.", variant: "destructive" });
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min atrás`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "text-status-online";
      case "stopped": return "text-status-away";
      case "idle": return "text-status-away";
      case "offline": return "text-status-offline";
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

  const getIgnitionLabel = (ignition: Vehicle["ignition"]) => {
    return ignition === "on" ? "Ligada" : "Desligada";
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "speed": return <Gauge className="h-4 w-4" />;
      case "geofence_entry":
      case "geofence_exit":
      case "geofence_dwell": return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical": return "text-destructive";
      case "warning": return "text-amber-500";
      default: return "text-primary";
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div>
          <h2 className="font-semibold text-lg">{vehicle.name}</h2>
          <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsEditOpen(true)} 
            data-testid="button-edit-vehicle"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsDeleteOpen(true)}
            className="text-destructive hover:text-destructive"
            data-testid="button-delete-vehicle"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3">
          <TabsTrigger value="details" data-testid="tab-details">Detalhes</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts" className="relative">
            Alertas
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 mt-0 p-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> Velocidade
                  </div>
                  <div className={cn(
                    "text-2xl font-mono font-bold",
                    vehicle.currentSpeed > vehicle.speedLimit && "text-destructive"
                  )}>
                    {vehicle.currentSpeed} <span className="text-sm font-normal">km/h</span>
                  </div>
                  {vehicle.currentSpeed > vehicle.speedLimit && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limite: {vehicle.speedLimit} km/h
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> Direção
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {vehicle.heading}°
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Precisão GPS
                  </div>
                  <div className="text-lg font-mono">
                    ±{vehicle.accuracy}m
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Radio className="h-3 w-3" /> Ignição
                  </div>
                  <div className="text-lg">
                    <Badge variant={vehicle.ignition === "on" ? "default" : "secondary"}>
                      {getIgnitionLabel(vehicle.ignition)}
                    </Badge>
                  </div>
                </div>
                
                {vehicle.batteryLevel !== undefined && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Battery className="h-3 w-3" /> Bateria
                    </div>
                    <div className="text-lg font-mono">
                      {vehicle.batteryLevel}%
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Status
                  </div>
                  <div className={cn("text-lg font-medium", getStatusColor(vehicle.status))}>
                    {getStatusLabel(vehicle.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Última atualização: {formatTime(vehicle.lastUpdate)}
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              onClick={onFollowVehicle}
              variant={isFollowing ? "default" : "outline"}
              className="w-full justify-start gap-2"
              data-testid="button-follow-vehicle"
            >
              <Navigation className="h-4 w-4" />
              {isFollowing ? "Seguindo veículo" : "Seguir veículo"}
            </Button>
            
            <Link href={`/history?vehicleId=${vehicle.id}`}>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-view-history">
                <History className="h-4 w-4" />
                Ver histórico
              </Button>
            </Link>
            
            <Link href={`/geofences?vehicleId=${vehicle.id}`}>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-create-geofence">
                <Shield className="h-4 w-4" />
                Criar geofence
              </Button>
            </Link>
            
            <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-set-speed-limit">
              <Settings className="h-4 w-4" />
              Definir limite de velocidade
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {vehicleAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta para este veículo</p>
                </div>
              ) : (
                vehicleAlerts.map(alert => (
                  <Card key={alert.id} className={cn(!alert.read && "border-l-2 border-l-primary")}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5", getAlertColor(alert.priority))}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                        {!alert.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">Últimas 5 atividades</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Iniciou movimento</p>
                    <p className="text-xs text-muted-foreground">Há 5 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-away" />
                  <div className="flex-1">
                    <p className="text-sm">Parou por 12 minutos</p>
                    <p className="text-xs text-muted-foreground">Há 17 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Entrou em área "Depósito"</p>
                    <p className="text-xs text-muted-foreground">Há 30 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <div className="flex-1">
                    <p className="text-sm">Excesso de velocidade: 85 km/h</p>
                    <p className="text-xs text-muted-foreground">Há 45 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Ignição ligada</p>
                    <p className="text-xs text-muted-foreground">Há 1 hora</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição de Veículo */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Caminhão 01"
                  data-testid="input-edit-vehicle-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-licensePlate">Placa *</Label>
                <Input
                  id="edit-licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Ex: ABC-1234"
                  data-testid="input-edit-vehicle-plate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Mercedes Actros"
                  data-testid="input-edit-vehicle-model"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-speedLimit">Limite de Velocidade (km/h)</Label>
                <Input
                  id="edit-speedLimit"
                  type="number"
                  value={formData.speedLimit}
                  onChange={(e) => setFormData({ ...formData, speedLimit: parseInt(e.target.value) || 80 })}
                  min={20}
                  max={180}
                  data-testid="input-edit-vehicle-speed-limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-latitude">Latitude</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || -23.5505 })}
                  data-testid="input-edit-vehicle-latitude"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-longitude">Longitude</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || -46.6333 })}
                  data-testid="input-edit-vehicle-longitude"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} data-testid="button-save-edit-vehicle">
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={(open) => {
        // Só permite fechar manualmente se não estiver excluindo
        if (!deleteMutation.isPending) {
          setIsDeleteOpen(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo <strong>{vehicle.name}</strong> ({vehicle.licensePlate})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-vehicle"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
