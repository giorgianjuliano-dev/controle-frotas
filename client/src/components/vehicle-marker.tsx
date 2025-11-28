import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Vehicle } from "@shared/schema";

const createVehicleIcon = (heading: number, status: Vehicle["status"]) => {
  const color = status === "moving" ? "#22c55e" : status === "stopped" ? "#f59e0b" : status === "idle" ? "#3b82f6" : "#9ca3af";
  
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading}, 20, 20)">
        <circle cx="20" cy="20" r="16" fill="${color}" stroke="white" stroke-width="2" />
        <polygon points="20,8 26,24 20,20 14,24" fill="white" />
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "vehicle-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface VehicleMarkerProps {
  vehicle: Vehicle;
  isSelected?: boolean;
  onClick?: () => void;
}

export function VehicleMarker({ vehicle, isSelected, onClick }: VehicleMarkerProps) {
  const icon = createVehicleIcon(vehicle.heading, vehicle.status);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min atrás`;
    return `${Math.floor(diffSeconds / 3600)}h atrás`;
  };

  return (
    <Marker
      position={[vehicle.latitude, vehicle.longitude]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="font-semibold text-base mb-1">{vehicle.name}</div>
          <div className="text-sm text-muted-foreground mb-2">{vehicle.licensePlate}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Velocidade:</span>
              <span className="font-mono font-medium">{vehicle.currentSpeed} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Direção:</span>
              <span className="font-mono">{vehicle.heading}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precisão:</span>
              <span className="font-mono">±{vehicle.accuracy}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atualização:</span>
              <span>{formatTime(vehicle.lastUpdate)}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
