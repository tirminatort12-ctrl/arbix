import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useMap } from "react-leaflet";

const COLORS = { good: "#2D6A4F", attention: "#D97706", danger: "#E11D48", removed: "#64748B" };
const STAR = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="#FBBF24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z"/></svg>`;
const cache = {};
const dot = (key, size, html) => (cache[key] ||= L.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html }));

const treeSize = (it, selected) => {
  if (selected) return 40;
  return it.is_monument ? 32 : 26;
};

export const iconFor = (it, selected) => {
  const sel = selected ? "#1B4332" : "#fff";
  if (it.kind === "osm") {
    const s = selected ? 26 : 16;
    return dot(`osm${selected}`, s, `<div style="width:${s}px;height:${s}px;border-radius:50%;background:#52B788;border:2px solid ${sel};box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`);
  }
  if (it.kind === "place") {
    const s = selected ? 38 : 30;
    return dot(`pl${selected}`, s, `<div style="width:${s}px;height:${s}px;border-radius:10px;background:#0369A1;border:3px solid ${sel};box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center"><svg viewBox="0 0 24 24" width="${s * 0.5}" height="${s * 0.5}" fill="none" stroke="#fff" stroke-width="2.4"><path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6"/></svg></div>`);
  }
  const c = COLORS[it.condition] || "#2D6A4F";
  const s = treeSize(it, selected);
  return dot(`t${c}${it.is_monument}${selected}`, s, `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${c};border:3px solid ${sel};box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center">${it.is_monument ? STAR(s * 0.55) : ""}</div>`);
};

const fmt = (n) => {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
};

const clusterSize = (n) => {
  if (n < 10) return 40;
  if (n < 100) return 48;
  if (n < 1000) return 56;
  return 64;
};

const clusterIcon = (cl) => {
  const ms = cl.getAllChildMarkers();
  const n = ms.length;
  const ours = ms.some((m) => m.options.kind !== "osm");
  const s = clusterSize(n);
  const bg = ours ? "#2D6A4F" : "#B5541C";
  return L.divIcon({
    className: "", iconSize: [s, s], iconAnchor: [s / 2, s / 2],
    html: `<div data-testid="map-cluster" style="width:${s}px;height:${s}px;border-radius:50%;background:${bg};color:#fff;font:700 ${s > 50 ? 15 : 13}px 'DM Sans',sans-serif;display:grid;place-items:center;border:4px solid ${ours ? "rgba(116,198,157,.55)" : "rgba(244,197,160,.65)"};box-shadow:0 3px 10px rgba(0,0,0,.25)">${fmt(n)}</div>`,
  });
};

export default function ClusterLayer({ items, selectedKey, onPick }) {
  const map = useMap();
  const group = useRef(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const g = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 55, disableClusteringAtZoom: 19, spiderfyOnMaxZoom: true, iconCreateFunction: clusterIcon });
    map.addLayer(g);
    group.current = g;
    return () => map.removeLayer(g);
  }, [map]);

  useEffect(() => {
    const g = group.current;
    g.clearLayers();
    g.addLayers(items.map((it) => {
      const m = L.marker([it.lat, it.lng], { icon: iconFor(it, it.key === selectedKey), kind: it.kind, zIndexOffset: it.key === selectedKey ? 1000 : 0 });
      m.on("click", () => pick.current(it));
      return m;
    }));
  }, [items, selectedKey]);

  return null;
}
