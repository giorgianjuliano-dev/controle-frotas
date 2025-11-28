import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Map, History, Shield, Bell, BarChart3, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";

import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import GeofencesPage from "@/pages/geofences";
import AlertsPage from "@/pages/alerts";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";

import type { Alert } from "@shared/schema";

function Navigation() {
  const [location] = useLocation();
  
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000,
  });
  
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const navItems = [
    { path: "/", label: "Dashboard", icon: Map },
    { path: "/history", label: "Histórico", icon: History },
    { path: "/geofences", label: "Geofences", icon: Shield },
    { path: "/alerts", label: "Alertas", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/reports", label: "Relatórios", icon: BarChart3 },
  ];

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-6 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Truck className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg hidden md:block">FleetTrack</span>
      </Link>
      
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map(item => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "gap-2 relative",
                  isActive && "font-medium"
                )}
                data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.badge !== undefined && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-5 px-1 text-[10px] absolute -top-1 -right-1"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/geofences" component={GeofencesPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="flex flex-col h-screen">
            <Navigation />
            <main className="flex-1 overflow-hidden">
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
