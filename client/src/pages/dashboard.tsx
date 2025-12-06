import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VehicleList } from "@/components/vehicle-list";
import { VehicleDetailPanel } from "@/components/vehicle-detail-panel";
import { FleetMap } from "@/components/fleet-map";
import { useVehicleWebSocket } from "@/hooks/use-websocket";
import type { Vehicle, Alert, Geofence } from "@shared/schema";

export default function Dashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [followVehicle, setFollowVehicle] = useState<Vehicle | undefined>();
  const [recentTrail, setRecentTrail] = useState<{ latitude: number; longitude: number }[]>([]);

  useVehicleWebSocket();

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000,
  });

  const { data: geofences = [] } = useQuery<Geofence[]>({
    queryKey: ["/api/geofences"],
  });

  useEffect(() => {
    if (selectedVehicle && vehicles.length > 0) {
      const updatedVehicle = vehicles.find(v => v.id === selectedVehicle.id);
      if (updatedVehicle) {
        setSelectedVehicle(updatedVehicle);
        
        setRecentTrail(prev => {
          const newTrail = [...prev, { latitude: updatedVehicle.latitude, longitude: updatedVehicle.longitude }];
          return newTrail.slice(-20);
        });

        if (followVehicle?.id === selectedVehicle.id) {
          setFollowVehicle(updatedVehicle);
        }
      } else {
        // Veículo foi excluído, limpar seleção
        setSelectedVehicle(undefined);
        setFollowVehicle(undefined);
        setRecentTrail([]);
      }
    }
  }, [vehicles, selectedVehicle?.id, followVehicle?.id]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFollowVehicle(undefined);
    setRecentTrail([{ latitude: vehicle.latitude, longitude: vehicle.longitude }]);
  };

  const handleCloseDetail = () => {
    setSelectedVehicle(undefined);
    setFollowVehicle(undefined);
    setRecentTrail([]);
  };

  const handleFollowVehicle = () => {
    if (followVehicle?.id === selectedVehicle?.id) {
      setFollowVehicle(undefined);
    } else {
      setFollowVehicle(selectedVehicle);
    }
  };

  return (
    <div className="flex h-full" data-testid="dashboard-page">
      <div className="w-80 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        <VehicleList
          vehicles={vehicles}
          selectedVehicleId={selectedVehicle?.id}
          onSelectVehicle={handleSelectVehicle}
          isLoading={isLoadingVehicles}
        />
      </div>
      
      <div className="flex-1 relative">
        <FleetMap
          vehicles={vehicles}
          geofences={geofences}
          selectedVehicle={selectedVehicle}
          followVehicle={followVehicle}
          recentTrail={recentTrail}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>
      
      {selectedVehicle && (
        <div className="w-[360px] flex-shrink-0 border-l border-sidebar-border">
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            alerts={alerts}
            onClose={handleCloseDetail}
            onFollowVehicle={handleFollowVehicle}
            isFollowing={followVehicle?.id === selectedVehicle.id}
          />
        </div>
      )}
    </div>
  );
}
