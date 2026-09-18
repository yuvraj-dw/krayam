import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ProcurementCentre, LocationCoordinates } from '../../types';

interface LeafletMapProps {
  farmerCoordinates?: LocationCoordinates;
  centres: ProcurementCentre[];
  selectedCentreId?: string;
  onSelectCentre?: (centre: ProcurementCentre) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  farmerCoordinates,
  centres,
  selectedCentreId,
  onSelectCentre
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom pins with light green and green palette
    const farmerIcon = L.divIcon({
      className: 'custom-farmer-pin',
      html: `
        <div style="background-color: #0c2417; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #BBEAA6; font-size: 16px; border: 2px solid #BBEAA6; box-shadow: 0 2px 8px rgba(12, 36, 23, 0.3);">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const centreIcon = (isSelected: boolean, load: string) => {
      const pinBg = isSelected ? '#166534' : '#ffffff';
      const pinBorder = isSelected ? '#BBEAA6' : load === 'High' ? '#dc2626' : load === 'Moderate' ? '#d97706' : '#166534';
      const pinColor = isSelected ? '#BBEAA6' : '#0c2417';

      return L.divIcon({
        className: 'custom-centre-pin',
        html: `
          <div style="background-color: ${pinBg}; width: ${isSelected ? '38px' : '32px'}; height: ${isSelected ? '38px' : '32px'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${pinColor}; font-size: ${isSelected ? '18px' : '15px'}; border: 2.5px solid ${pinBorder}; box-shadow: ${isSelected ? '0 0 14px rgba(22, 101, 52, 0.4)' : '0 2px 6px rgba(0,0,0,0.15)'}; transition: transform 0.2s;">
            🏢
          </div>
        `,
        iconSize: isSelected ? [38, 38] : [32, 32],
        iconAnchor: isSelected ? [19, 19] : [16, 16]
      });
    };

    const firstCentreCoords = centres[0]?.location?.coordinates;
    const initialLat = farmerCoordinates?.latitude ?? farmerCoordinates?.lat ?? firstCentreCoords?.latitude ?? firstCentreCoords?.lat ?? 28.6139;
    const initialLng = farmerCoordinates?.longitude ?? farmerCoordinates?.lng ?? firstCentreCoords?.longitude ?? firstCentreCoords?.lng ?? 77.2090;

    // Initialize map if not yet initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        [initialLat, initialLng],
        farmerCoordinates ? 11 : 9
      );

      // Voyager tile layer for crisp natural light appearance
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add Farmer Location if available
    const farmerLat = farmerCoordinates?.latitude ?? farmerCoordinates?.lat;
    const farmerLng = farmerCoordinates?.longitude ?? farmerCoordinates?.lng;
    if (farmerLat !== undefined && farmerLng !== undefined) {
      const farmerMarker = L.marker([farmerLat, farmerLng], { icon: farmerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.45px; color: #166534; font-weight: bold;">Origin Coordinates</span>
            <div style="font-size: 13px; font-weight: bold; color: #0d2618; margin-top: 2px;">Farmer Location</div>
          </div>
        `);
      markersRef.current.push(farmerMarker);
    }

    // Add Centre Markers
    centres.forEach(centre => {
      const cLat = centre.location?.coordinates?.latitude ?? centre.location?.coordinates?.lat;
      const cLng = centre.location?.coordinates?.longitude ?? centre.location?.coordinates?.lng;
      if (cLat === undefined || cLng === undefined) return;

      const isSelected = centre.id === selectedCentreId;
      const loadLevel = centre.currentQueue?.loadLevel || 'Low';
      const activeVehicles = centre.currentQueue?.activeVehicles ?? 0;
      const distStr = centre.distanceKm !== undefined ? `${centre.distanceKm} km` : '';

      const marker = L.marker(
        [cLat, cLng],
        { icon: centreIcon(isSelected, loadLevel) }
      )
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.45px; color: #166534; font-weight: bold;">Mandi Terminal</span>
              ${distStr ? `<span style="font-size: 11px; font-weight: bold; color: #166534;">${distStr}</span>` : ''}
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #0d2618; margin-top: 2px;">${centre.name}</div>
            <div style="font-size: 11px; color: #2e5a40; margin-top: 2px;">${centre.location.address || ''}</div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #cdeac6;">
              <span style="color: #2e5a40;">Queue Load:</span>
              <span style="color: ${loadLevel === 'High' ? '#dc2626' : loadLevel === 'Moderate' ? '#d97706' : '#166534'}; font-weight: bold;">
                ${loadLevel} (${activeVehicles} vehicles)
              </span>
            </div>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${cLat},${cLng}" 
               target="_blank" 
               rel="noreferrer"
               style="display: block; text-align: center; background-color: #166534; color: #ffffff; padding: 6px 12px; border-radius: 56px; text-decoration: none; font-size: 11px; margin-top: 8px; font-weight: bold; letter-spacing: -0.08px;">
               Launch GPS Navigation ↗
            </a>
          </div>
        `);

      marker.on('click', () => {
        if (onSelectCentre) {
          onSelectCentre(centre);
        }
      });

      markersRef.current.push(marker);
    });

    const validPoints: [number, number][] = [];
    if (farmerLat !== undefined && farmerLng !== undefined) {
      validPoints.push([farmerLat, farmerLng]);
    }
    centres.forEach(c => {
      const lat = c.location?.coordinates?.latitude ?? c.location?.coordinates?.lat;
      const lng = c.location?.coordinates?.longitude ?? c.location?.coordinates?.lng;
      if (lat !== undefined && lng !== undefined) {
        validPoints.push([lat, lng]);
      }
    });

    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [farmerCoordinates, centres, selectedCentreId, onSelectCentre]);

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-[20px] overflow-hidden border border-[#cdeac6] bg-[#f4fbf5]">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* HUD Telemetry Legend */}
      <div className="absolute top-3 right-3 bg-[#ffffff]/95 backdrop-blur-md px-3.5 py-2 rounded-[56px] border border-[#cdeac6] text-[9px] uppercase tracking-[0.45px] text-[#0d2618] z-[1000] flex items-center gap-3 shadow-sm">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0c2417] border border-[#BBEAA6]" /> You</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#166534]" /> Low Load</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d97706]" /> Moderate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#dc2626]" /> High</span>
      </div>
    </div>
  );
};
