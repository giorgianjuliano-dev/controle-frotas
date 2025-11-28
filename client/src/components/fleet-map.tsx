import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, Polyline, Circle, Polygon } from "react-leaflet";
import { LatLngBounds, LatLng } from "leaflet";
import { ZoomIn, ZoomOut, Crosshair, Maximize2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleMarker } from "./vehicle-marker";
import type { Vehicle, Geofence } from "@shared/schema";
import "leaflet/dist/leaflet.css";

interface FleetMapProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  selectedVehicle?: Vehicle;
  followVehicle?: Vehicle;
  recentTrail?: { latitude: number; longitude: number }[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

function MapController({ selectedVehicle, followVehicle }: { selectedVehicle?: Vehicle; followVehicle?: Vehicle }) {
  const map = useMap();
  const prevFollowRef = useRef<string | null>(null);

  useEffect(() => {
    if (followVehicle) {
      map.setView([followVehicle.latitude, followVehicle.longitude], map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    } else if (selectedVehicle && prevFollowRef.current !== selectedVehicle.id) {
      map.setView([selectedVehicle.latitude, selectedVehicle.longitude], 15, {
        animate: true,
        duration: 0.5,
      });
      prevFollowRef.current = selectedVehicle.id;
    }
  }, [selectedVehicle, followVehicle, map]);

  return null;
}

function MapControls({ onZoomIn, onZoomOut, onCenter, onFullscreen }: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomIn}
        className="h-10 w-10 rounded-full shadow-lg"
        data-testid="button-zoom-in"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomOut}
        className="h-10 w-10 rounded-full shadow-lg"
        data-testid="button-zoom-out"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onCenter}
        className="h-10 w-10 rounded-full shadow-lg"
        data-testid="button-center"
      >
        <Crosshair className="h-5 w-5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onFullscreen}
        className="h-10 w-10 rounded-full shadow-lg"
        data-testid="button-fullscreen"
      >
        <Maximize2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

function GeofenceOverlay({ geofence }: { geofence: Geofence }) {
  const color = geofence.color || "#3b82f6";
  const fillColor = color;

  if (geofence.type === "circle" && geofence.center && geofence.radius) {
    return (
      <Circle
        center={[geofence.center.latitude, geofence.center.longitude]}
        radius={geofence.radius}
        pathOptions={{
          color,
          fillColor,
          fillOpacity: 0.2,
          weight: 2,
        }}
      />
    );
  }

  if (geofence.type === "polygon" && geofence.points && geofence.points.length >= 3) {
    const positions = geofence.points.map(p => [p.latitude, p.longitude] as [number, number]);
    return (
      <Polygon
        positions={positions}
        pathOptions={{
          color,
          fillColor,
          fillOpacity: 0.2,
          weight: 2,
        }}
      />
    );
  }

  return null;
}

export function FleetMap({ 
  vehicles, 
  geofences = [], 
  selectedVehicle, 
  followVehicle,
  recentTrail,
  onSelectVehicle 
}: FleetMapProps) {
  const mapRef = useRef<any>(null);
  const [mapLayer, setMapLayer] = useState<"street" | "satellite">("street");

  const defaultCenter: [number, number] = [-23.5505, -46.6333];
  const defaultZoom = 12;

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleCenter = () => {
    if (mapRef.current && vehicles.length > 0) {
      if (selectedVehicle) {
        mapRef.current.setView([selectedVehicle.latitude, selectedVehicle.longitude], 15);
      } else {
        const bounds = new LatLngBounds(
          vehicles.map(v => new LatLng(v.latitude, v.longitude))
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const handleFullscreen = () => {
    const mapElement = document.querySelector(".leaflet-container");
    if (mapElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapElement.requestFullscreen();
      }
    }
  };

  const tileUrl = mapLayer === "street"
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        
        <MapController selectedVehicle={selectedVehicle} followVehicle={followVehicle} />
        
        {geofences.filter(g => g.active).map(geofence => (
          <GeofenceOverlay key={geofence.id} geofence={geofence} />
        ))}
        
        {recentTrail && recentTrail.length > 1 && (
          <Polyline
            positions={recentTrail.map(p => [p.latitude, p.longitude] as [number, number])}
            pathOptions={{
              color: "#3b82f6",
              weight: 3,
              opacity: 0.7,
              dashArray: "5, 10",
            }}
          />
        )}
        
        {vehicles.map(vehicle => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedVehicle?.id === vehicle.id}
            onClick={() => onSelectVehicle(vehicle)}
          />
        ))}
      </MapContainer>

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
        onFullscreen={handleFullscreen}
      />

      <div className="absolute bottom-4 left-4 z-[1000]">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMapLayer(mapLayer === "street" ? "satellite" : "street")}
          className="shadow-lg gap-2"
          data-testid="button-toggle-layer"
        >
          <Layers className="h-4 w-4" />
          {mapLayer === "street" ? "Satélite" : "Mapa"}
        </Button>
      </div>

      {selectedVehicle && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-card p-3 rounded-lg shadow-lg min-w-[200px]">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Veículo Selecionado
          </div>
          <div className="font-semibold">{selectedVehicle.name}</div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <span className="text-muted-foreground">Velocidade:</span>
              <span className="font-mono ml-1">{selectedVehicle.currentSpeed} km/h</span>
            </div>
            <div>
              <span className="text-muted-foreground">Direção:</span>
              <span className="font-mono ml-1">{selectedVehicle.heading}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
