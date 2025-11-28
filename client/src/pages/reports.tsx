import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Gauge, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Download, Calendar as CalendarIcon, Truck, BarChart3
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { VehicleStats, SpeedViolation } from "@shared/schema";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<VehicleStats>({
    queryKey: ["/api/reports/speed-stats", dateRange.from.toISOString(), dateRange.to.toISOString()],
  });

  const { data: violations = [], isLoading: isLoadingViolations } = useQuery<SpeedViolation[]>({
    queryKey: ["/api/reports/violations", dateRange.from.toISOString(), dateRange.to.toISOString()],
  });

  const quickFilters = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
    { label: "Últimos 90 dias", days: 90 },
  ];

  const handleQuickFilter = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const chartData = stats?.violationsByDay?.map(item => ({
    date: format(new Date(item.date), "dd/MM", { locale: ptBR }),
    count: item.count,
  })) || [];

  return (
    <div className="flex flex-col h-full" data-testid="reports-page">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold">Relatórios de Velocidade</h1>
            <p className="text-sm text-muted-foreground">
              Análise de conformidade e infrações de velocidade
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
            
            {quickFilters.map(filter => (
              <Button
                key={filter.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.days)}
                data-testid={`filter-${filter.days}`}
              >
                {filter.label}
              </Button>
            ))}
            
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Total de Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.totalViolations || 0}
                    </span>
                    <div className="flex items-center gap-1 pb-1">
                      {getTrendIcon(stats?.totalViolations || 0, (stats?.totalViolations || 0) * 0.9)}
                      <span className="text-xs text-muted-foreground">vs. período anterior</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Truck className="h-4 w-4" />
                    Veículos com Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.vehiclesWithViolations || 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">veículos</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Gauge className="h-4 w-4" />
                    Excesso Médio
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono text-destructive">
                      +{Math.round(stats?.averageExcessSpeed || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">km/h acima do limite</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Infrações por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-64" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.count > 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top 10 Veículos com Mais Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !stats?.topViolators || stats.topViolators.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração registrada no período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Total de Infrações</TableHead>
                    <TableHead className="text-right">Excesso Médio</TableHead>
                    <TableHead className="text-right">Última Infração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topViolators.map((violator, index) => (
                    <TableRow 
                      key={violator.vehicleId}
                      className={cn(index < 3 && "bg-destructive/5")}
                      data-testid={`violator-${violator.vehicleId}`}
                    >
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? "destructive" : "secondary"}
                          className="w-8 justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{violator.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {violator.totalViolations}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        +{Math.round(violator.averageExcessSpeed)} km/h
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(violator.lastViolation)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Detalhamento de Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingViolations ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="text-center py-8">
                <Gauge className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração detalhada disponível</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Velocidade</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead className="text-right">Excesso</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.slice(0, 20).map((violation) => (
                    <TableRow key={violation.id} data-testid={`violation-${violation.id}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(violation.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{violation.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {violation.speed} km/h
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.speedLimit} km/h
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          +{violation.excessSpeed} km/h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.duration}s
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
