import { useEffect } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

const COLORS = { good: "#2D6A4F", attention: "#D97706", danger: "#E11D48", removed: "#64748B" };

const icon = (t, selected) => {
  const c = COLORS[t.condition] || "#2D6A4F";
  const size = selected ? 38 : t.is_monument ? 32 : 24;
  const inner = t.is_monument
    ? `<svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" fill="#FBBF24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z"/></svg>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};border:3px solid ${selected ? "#1B4332" : "#fff"};box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center">${inner}</div>`,
  });
};

const placeIcon = (selected) => {
  const size = selected ? 38 : 30;
  return L.divIcon({
    className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:10px;background:#0369A1;border:3px solid ${selected ? "#1B4332" : "#fff"};box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center"><svg viewBox="0 0 24 24" width="${size * 0.5}" height="${size * 0.5}" fill="none" stroke="#fff" stroke-width="2.4"><path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6"/></svg></div>`,
  });
};

const Fit = ({ points, focus }) => {
  const map = useMap();
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], 18);
    else if (points.length === 1) map.setView(points[0], 17);
    else if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 18 });
  }, [map, points, focus]);
  return null;
};

export default function TreeMap({ trees, places = [], focusToken, focusPlace, height = "60vh" }) {
  const located = trees.filter((t) => t.lat != null && t.lng != null);
  const locPlaces = places.filter((p) => p.lat != null && p.lng != null);
  const points = [...located, ...locPlaces].map((t) => [t.lat, t.lng]);
  const focus = located.find((t) => t.public_token === focusToken) || locPlaces.find((p) => p.id === focusPlace);
  const center = points[0] || [52.0693, 19.4803];
  return (
    <div className="relative z-0 overflow-hidden rounded-3xl border border-emerald-100" style={{ height }} data-testid="park-map">
      <MapContainer center={center} zoom={points.length ? 16 : 6} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} focus={focus} />
        {located.map((t) => (
          <Marker key={t.public_token} position={[t.lat, t.lng]} icon={icon(t, t.public_token === focusToken)}>
            <Popup>
              <div className="min-w-[160px]" data-testid={`map-popup-${t.tag_number}`}>
                {t.is_monument && <div className="text-[11px] font-bold uppercase text-amber-600">Pomnik przyrody</div>}
                <div className="font-display text-base font-bold text-slate-800">{(t.is_monument && t.monument_name) || t.species}</div>
                {t.is_monument && t.monument_name && <div className="text-xs text-slate-600">{t.species}</div>}
                <div className="font-mono-tag text-xs text-slate-500">{t.tag_number}</div>
                <Link to={`/t/${t.public_token}`} data-testid={`map-open-tree-${t.tag_number}`} className="mt-2 inline-block font-semibold" style={{ color: "#2D6A4F" }}>Zobacz drzewo →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
        {locPlaces.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={placeIcon(p.id === focusPlace)}>
            <Popup>
              <div className="min-w-[160px]" data-testid={`map-popup-place-${p.id}`}>
                <div className="text-[11px] font-bold uppercase" style={{ color: "#0369A1" }}>Atrakcja</div>
                <div className="font-display text-base font-bold text-slate-800">{p.name}</div>
                <Link to={`/atrakcje/${p.id}`} data-testid={`map-open-place-${p.id}`} className="mt-2 inline-block font-semibold" style={{ color: "#2D6A4F" }}>Zobacz →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
