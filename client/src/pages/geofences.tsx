import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Circle, Polygon, useMapEvents, Marker } from "react-leaflet";
import L from "leaflet";
import { 
  Plus, Trash2, Edit2, MapPin, Shield, Clock, 
  AlertTriangle, Check, X, Circle as CircleIcon, Pentagon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Geofence, GeofenceRule, Vehicle } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const centerIcon = L.divIcon({
  html: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/></svg>`,
  className: "center-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface DrawingMapProps {
  type: "circle" | "polygon";
  center?: { latitude: number; longitude: number };
  radius?: number;
  points?: { latitude: number; longitude: number }[];
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
  onRadiusChange: (radius: number) => void;
  onPointsChange: (points: { latitude: number; longitude: number }[]) => void;
}

function DrawingMap({ type, center, radius = 500, points = [], onCenterChange, onRadiusChange, onPointsChange }: DrawingMapProps) {
  const [localPoints, setLocalPoints] = useState(points);

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      if (type === "circle") {
        onCenterChange({ latitude: lat, longitude: lng });
      } else {
        const newPoints = [...localPoints, { latitude: lat, longitude: lng }];
        setLocalPoints(newPoints);
        onPointsChange(newPoints);
      }
    },
  });

  const handleClearPolygon = () => {
    setLocalPoints([]);
    onPointsChange([]);
  };

  return (
    <>
      {type === "circle" && center && (
        <>
          <Circle
            center={[center.latitude, center.longitude]}
            radius={radius}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
          <Marker position={[center.latitude, center.longitude]} icon={centerIcon} />
        </>
      )}
      
      {type === "polygon" && localPoints.length > 0 && (
        <>
          {localPoints.length >= 3 && (
            <Polygon
              positions={localPoints.map(p => [p.latitude, p.longitude] as [number, number])}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
          {localPoints.map((point, index) => (
            <Marker
              key={index}
              position={[point.latitude, point.longitude]}
              icon={centerIcon}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function GeofencesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "circle" as "circle" | "polygon",
    active: true,
    center: undefined as { latitude: number; longitude: number } | undefined,
    radius: 500,
    points: [] as { latitude: number; longitude: number }[],
    rules: [
      { type: "entry" as const, enabled: true, toleranceSeconds: 30 },
      { type: "exit" as const, enabled: true, toleranceSeconds: 30 },
      { type: "dwell" as const, enabled: false, dwellTimeMinutes: 30, toleranceSeconds: 30 },
    ] as GeofenceRule[],
    vehicleIds: [] as string[],
  });

  const { data: geofences = [], isLoading: isLoadingGeofences } = useQuery<Geofence[]>({
    queryKey: ["/api/geofences"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/geofences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      toast({ title: "Geofence criada", description: "A nova geofence foi criada com sucesso." });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar a geofence.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/geofences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      toast({ title: "Geofence excluída", description: "A geofence foi excluída com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a geofence.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/geofences/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      return apiRequest("PATCH", `/api/geofences/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      toast({ title: "Geofence atualizada", description: "A geofence foi atualizada com sucesso." });
      setEditingGeofence(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a geofence.", variant: "destructive" });
    },
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (editingGeofence) {
      setFormData({
        name: editingGeofence.name,
        description: editingGeofence.description || "",
        type: editingGeofence.type,
        active: editingGeofence.active,
        center: editingGeofence.center,
        radius: editingGeofence.radius || 500,
        points: editingGeofence.points || [],
        rules: editingGeofence.rules || [
          { type: "entry", enabled: true, toleranceSeconds: 30 },
          { type: "exit", enabled: true, toleranceSeconds: 30 },
          { type: "dwell", enabled: false, dwellTimeMinutes: 30, toleranceSeconds: 30 },
        ],
        vehicleIds: editingGeofence.vehicleIds || [],
      });
    }
  }, [editingGeofence]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "circle",
      active: true,
      center: undefined,
      radius: 500,
      points: [],
      rules: [
        { type: "entry", enabled: true, toleranceSeconds: 30 },
        { type: "exit", enabled: true, toleranceSeconds: 30 },
        { type: "dwell", enabled: false, dwellTimeMinutes: 30, toleranceSeconds: 30 },
      ],
      vehicleIds: [],
    });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Erro", description: "Digite um nome para a geofence.", variant: "destructive" });
      return;
    }
    if (formData.type === "circle" && !formData.center) {
      toast({ title: "Erro", description: "Clique no mapa para definir o centro da área.", variant: "destructive" });
      return;
    }
    if (formData.type === "polygon" && formData.points.length < 3) {
      toast({ title: "Erro", description: "Desenhe ao menos 3 pontos para formar um polígono.", variant: "destructive" });
      return;
    }
    
    if (editingGeofence) {
      updateMutation.mutate({ ...formData, id: editingGeofence.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleUpdateSubmit = () => {
    if (!editingGeofence) return;
    if (!formData.name) {
      toast({ title: "Erro", description: "Digite um nome para a geofence.", variant: "destructive" });
      return;
    }
    if (formData.type === "circle" && !formData.center) {
      toast({ title: "Erro", description: "Clique no mapa para definir o centro da área.", variant: "destructive" });
      return;
    }
    if (formData.type === "polygon" && formData.points.length < 3) {
      toast({ title: "Erro", description: "Desenhe ao menos 3 pontos para formar um polígono.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editingGeofence.id, data: formData });
  };

  const openEditDialog = (geofence: Geofence) => {
    setFormData({
      name: geofence.name,
      description: geofence.description || "",
      type: geofence.type,
      active: geofence.active,
      center: geofence.center,
      radius: geofence.radius || 500,
      points: geofence.points || [],
      rules: geofence.rules.length > 0 ? geofence.rules : [
        { type: "entry", enabled: true, toleranceSeconds: 30 },
        { type: "exit", enabled: true, toleranceSeconds: 30 },
        { type: "dwell", enabled: false, dwellTimeMinutes: 30, toleranceSeconds: 30 },
      ],
      vehicleIds: geofence.vehicleIds,
    });
    setEditingGeofence(geofence);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-full" data-testid="geofences-page">
      <div className="w-[400px] flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Geofences</h2>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2" data-testid="button-create-geofence">
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoadingGeofences ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            ) : geofences.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma geofence criada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Criar" para adicionar uma nova área
                </p>
              </div>
            ) : (
              geofences.map(geofence => (
                <Card
                  key={geofence.id}
                  className={cn(
                    "cursor-pointer hover-elevate",
                    selectedGeofence?.id === geofence.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedGeofence(geofence)}
                  data-testid={`geofence-${geofence.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {geofence.type === "circle" ? (
                          <CircleIcon className="h-4 w-4 text-primary" />
                        ) : (
                          <Pentagon className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">{geofence.name}</span>
                      </div>
                      <Switch
                        checked={geofence.active}
                        onCheckedChange={(checked) => {
                          toggleMutation.mutate({ id: geofence.id, active: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`toggle-${geofence.id}`}
                      />
                    </div>
                    
                    {geofence.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {geofence.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={geofence.active ? "default" : "secondary"} className="text-[10px]">
                        {geofence.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <span>•</span>
                      <span>{geofence.vehicleIds.length} veículos</span>
                      <span>•</span>
                      <span>Último: {formatDate(geofence.lastTriggered)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(geofence);
                        }}
                        data-testid={`edit-${geofence.id}`}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Tem certeza que deseja excluir esta geofence?")) {
                            deleteMutation.mutate(geofence.id);
                          }
                        }}
                        data-testid={`delete-${geofence.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={[-23.5505, -46.6333]}
          zoom={12}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {geofences.filter(g => g.active).map(geofence => {
            if (geofence.type === "circle" && geofence.center && geofence.radius) {
              return (
                <Circle
                  key={geofence.id}
                  center={[geofence.center.latitude, geofence.center.longitude]}
                  radius={geofence.radius}
                  pathOptions={{
                    color: geofence.color || "#3b82f6",
                    fillColor: geofence.color || "#3b82f6",
                    fillOpacity: selectedGeofence?.id === geofence.id ? 0.3 : 0.15,
                    weight: selectedGeofence?.id === geofence.id ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedGeofence(geofence),
                  }}
                />
              );
            }
            if (geofence.type === "polygon" && geofence.points && geofence.points.length >= 3) {
              return (
                <Polygon
                  key={geofence.id}
                  positions={geofence.points.map(p => [p.latitude, p.longitude] as [number, number])}
                  pathOptions={{
                    color: geofence.color || "#3b82f6",
                    fillColor: geofence.color || "#3b82f6",
                    fillOpacity: selectedGeofence?.id === geofence.id ? 0.3 : 0.15,
                    weight: selectedGeofence?.id === geofence.id ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedGeofence(geofence),
                  }}
                />
              );
            }
            return null;
          })}
        </MapContainer>

        {!selectedGeofence && geofences.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000]">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Crie sua primeira geofence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Geofences são áreas virtuais que permitem receber alertas quando veículos entram ou saem dessas regiões.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Geofence
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col" style={{ zIndex: 1000 }}>
          <DialogHeader>
            <DialogTitle>Criar Nova Geofence</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            <div className="w-[300px] flex-shrink-0 space-y-4 overflow-y-auto pr-2 relative z-[100] bg-background">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Depósito Central"
                  data-testid="input-geofence-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={2}
                  data-testid="input-geofence-description"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Área</Label>
                <Tabs value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "circle" | "polygon", center: undefined, points: [] })}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="circle" className="gap-2">
                      <CircleIcon className="h-4 w-4" />
                      Círculo
                    </TabsTrigger>
                    <TabsTrigger value="polygon" className="gap-2">
                      <Pentagon className="h-4 w-4" />
                      Polígono
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {formData.type === "circle" && (
                <div className="space-y-2">
                  <Label htmlFor="radius">Raio (metros)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 500 })}
                    min={50}
                    max={10000}
                    data-testid="input-radius"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <Label>Regras de Alerta</Label>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Alertar entrada</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "entry")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "entry" ? { ...r, enabled: checked } : r),
                      });
                    }}
                    data-testid="switch-entry"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Alertar saída</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "exit")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "exit" ? { ...r, enabled: checked } : r),
                      });
                    }}
                    data-testid="switch-exit"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Permanência prolongada</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "dwell")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "dwell" ? { ...r, enabled: checked } : r),
                      });
                    }}
                    data-testid="switch-dwell"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tolerance">Tolerância (segundos)</Label>
                <Input
                  id="tolerance"
                  type="number"
                  value={formData.rules[0]?.toleranceSeconds || 30}
                  onChange={(e) => {
                    const tolerance = parseInt(e.target.value) || 30;
                    setFormData({
                      ...formData,
                      rules: formData.rules.map(r => ({ ...r, toleranceSeconds: tolerance })),
                    });
                  }}
                  min={0}
                  max={300}
                  data-testid="input-tolerance"
                />
                <p className="text-xs text-muted-foreground">
                  Ignora entradas/saídas que durarem menos que este tempo
                </p>
              </div>
            </div>
            
            <div className="flex-1 rounded-lg overflow-hidden border relative z-0 isolate">
              <MapContainer
                center={[-23.5505, -46.6333]}
                zoom={13}
                className="h-full w-full geofence-dialog-map"
                style={{ zIndex: 7 }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DrawingMap
                  type={formData.type}
                  center={formData.center}
                  radius={formData.radius}
                  points={formData.points}
                  onCenterChange={(center) => setFormData({ ...formData, center })}
                  onRadiusChange={(radius) => setFormData({ ...formData, radius })}
                  onPointsChange={(points) => setFormData({ ...formData, points })}
                />
              </MapContainer>
            </div>
          </div>
          
          <DialogFooter>
            <p className="text-xs text-muted-foreground mr-auto">
              {formData.type === "circle" 
                ? "Clique no mapa para definir o centro da área circular"
                : "Clique no mapa para adicionar pontos do polígono"}
            </p>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-geofence">
              {createMutation.isPending ? "Salvando..." : "Salvar Geofence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={!!editingGeofence} onOpenChange={(open) => { if (!open) { setEditingGeofence(null); resetForm(); } }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col" style={{ zIndex: 1000 }}>
          <DialogHeader>
            <DialogTitle>Editar Geofence</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            <div className="w-[300px] flex-shrink-0 space-y-4 overflow-y-auto pr-2 relative z-[100] bg-background">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Depósito Central"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Área</Label>
                <Tabs value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "circle" | "polygon", center: undefined, points: [] })}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="circle" className="gap-2">
                      <CircleIcon className="h-4 w-4" />
                      Círculo
                    </TabsTrigger>
                    <TabsTrigger value="polygon" className="gap-2">
                      <Pentagon className="h-4 w-4" />
                      Polígono
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {formData.type === "circle" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-radius">Raio (metros)</Label>
                  <Input
                    id="edit-radius"
                    type="number"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 500 })}
                    min={50}
                    max={10000}
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <Label>Regras de Alerta</Label>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Alertar entrada</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "entry")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "entry" ? { ...r, enabled: checked } : r),
                      });
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Alertar saída</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "exit")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "exit" ? { ...r, enabled: checked } : r),
                      });
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Permanência prolongada</span>
                  </div>
                  <Switch
                    checked={formData.rules.find(r => r.type === "dwell")?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        rules: formData.rules.map(r => r.type === "dwell" ? { ...r, enabled: checked } : r),
                      });
                    }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tolerance">Tolerância (segundos)</Label>
                <Input
                  id="edit-tolerance"
                  type="number"
                  value={formData.rules[0]?.toleranceSeconds || 30}
                  onChange={(e) => {
                    const tolerance = parseInt(e.target.value) || 30;
                    setFormData({
                      ...formData,
                      rules: formData.rules.map(r => ({ ...r, toleranceSeconds: tolerance })),
                    });
                  }}
                  min={0}
                  max={300}
                />
                <p className="text-xs text-muted-foreground">
                  Ignora entradas/saídas que durarem menos que este tempo
                </p>
              </div>
            </div>
            
            <div className="flex-1 rounded-lg overflow-hidden border relative z-0 isolate">
              <MapContainer
                center={formData.center ? [formData.center.latitude, formData.center.longitude] : [-23.5505, -46.6333]}
                zoom={13}
                className="h-full w-full geofence-dialog-map"
                style={{ zIndex: 7 }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DrawingMap
                  type={formData.type}
                  center={formData.center}
                  radius={formData.radius}
                  points={formData.points}
                  onCenterChange={(center) => setFormData({ ...formData, center })}
                  onRadiusChange={(radius) => setFormData({ ...formData, radius })}
                  onPointsChange={(points) => setFormData({ ...formData, points })}
                />
              </MapContainer>
            </div>
          </div>
          
          <DialogFooter>
            <p className="text-xs text-muted-foreground mr-auto">
              {formData.type === "circle" 
                ? "Clique no mapa para definir o centro da área circular"
                : "Clique no mapa para adicionar pontos do polígono"}
            </p>
            <Button variant="outline" onClick={() => { setEditingGeofence(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
