import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Bell, Gauge, Shield, AlertTriangle, Check, CheckCheck, 
  Trash2, Filter, MapPin, Clock, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";

type FilterType = "all" | "speed" | "geofence" | "system" | "unread";

export default function AlertsPage() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/alerts/${id}`, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/alerts/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Todos os alertas foram marcados como lidos" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/alerts/clear-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alertas lidos foram removidos" });
    },
  });

  const filters: { key: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "all", label: "Todos", icon: <Bell className="h-4 w-4" />, count: alerts.length },
    { key: "speed", label: "Velocidade", icon: <Gauge className="h-4 w-4" />, count: alerts.filter(a => a.type === "speed").length },
    { key: "geofence", label: "Geofence", icon: <Shield className="h-4 w-4" />, count: alerts.filter(a => a.type.startsWith("geofence")).length },
    { key: "system", label: "Sistema", icon: <AlertTriangle className="h-4 w-4" />, count: alerts.filter(a => a.type === "system").length },
    { key: "unread", label: "Não lidos", icon: <Bell className="h-4 w-4" />, count: alerts.filter(a => !a.read).length },
  ];

  const filteredAlerts = alerts.filter(alert => {
    switch (activeFilter) {
      case "speed":
        return alert.type === "speed";
      case "geofence":
        return alert.type.startsWith("geofence");
      case "system":
        return alert.type === "system";
      case "unread":
        return !alert.read;
      default:
        return true;
    }
  });

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "speed":
        return <Gauge className="h-5 w-5" />;
      case "geofence_entry":
      case "geofence_exit":
      case "geofence_dwell":
        return <Shield className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical":
        return "text-destructive bg-destructive/10";
      case "warning":
        return "text-amber-500 bg-amber-500/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  const getPriorityLabel = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical": return "Crítico";
      case "warning": return "Aviso";
      default: return "Info";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return "Agora mesmo";
    if (diffSeconds < 3600) return `Há ${Math.floor(diffSeconds / 60)} minutos`;
    if (diffSeconds < 86400) return `Há ${Math.floor(diffSeconds / 3600)} horas`;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="flex h-full" data-testid="alerts-page">
      <div className="w-[280px] flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="font-semibold text-lg mb-1">Alertas</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lidos` : "Todos os alertas lidos"}
          </p>
        </div>
        
        <div className="p-4 space-y-2">
          {filters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover-elevate",
                activeFilter === filter.key
                  ? "bg-sidebar-accent font-medium"
                  : "text-muted-foreground"
              )}
              data-testid={`filter-${filter.key}`}
            >
              {filter.icon}
              <span className="flex-1 text-left">{filter.label}</span>
              <Badge variant="secondary" className="text-[10px]">
                {filter.count}
              </Badge>
            </button>
          ))}
        </div>
        
        <div className="mt-auto p-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todos como lidos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => {
              if (confirm("Tem certeza que deseja remover todos os alertas lidos?")) {
                clearAllMutation.mutate();
              }
            }}
            disabled={alerts.filter(a => a.read).length === 0 || clearAllMutation.isPending}
            data-testid="button-clear-read"
          >
            <Trash2 className="h-4 w-4" />
            Limpar lidos
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Mostrando {filteredAlerts.length} de {alerts.length} alertas
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum alerta encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {activeFilter === "unread"
                    ? "Você leu todos os alertas!"
                    : "Não há alertas para o filtro selecionado"}
                </p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <Card
                  key={alert.id}
                  className={cn(
                    "transition-all hover-elevate",
                    !alert.read && "border-l-4 border-l-primary"
                  )}
                  data-testid={`alert-${alert.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-full flex-shrink-0",
                        getAlertColor(alert.priority)
                      )}>
                        {getAlertIcon(alert.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{alert.vehicleName}</span>
                            <Badge
                              variant={alert.priority === "critical" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {getPriorityLabel(alert.priority)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-2">{alert.message}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {alert.speed !== undefined && alert.speedLimit !== undefined && (
                            <div className="flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              <span className="font-mono">
                                {alert.speed} / {alert.speedLimit} km/h
                              </span>
                            </div>
                          )}
                          
                          {alert.geofenceName && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              <span>{alert.geofenceName}</span>
                            </div>
                          )}
                          
                          {alert.latitude && alert.longitude && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">
                                {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!alert.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markReadMutation.mutate(alert.id)}
                            disabled={markReadMutation.isPending}
                            data-testid={`mark-read-${alert.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`view-${alert.id}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
