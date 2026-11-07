import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Award, Info, Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import AppShell from "@/components/AppShell";
import ClusterLayer from "@/components/ClusterLayer";
import MapSheet from "@/components/MapSheet";
import { GlobalSearch } from "@/components/Discover";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const OSM_ZOOM = 15;
const clamp = (b) => {
  const c = b.getCenter();
  const dLat = Math.min((b.getNorth() - b.getSouth()) / 2, 0.019);
  const dLng = Math.min((b.getEast() - b.getWest()) / 2, 0.029);
  return { s: c.lat - dLat, n: c.lat + dLat, w: c.lng - dLng, e: c.lng + dLng };
};

const OsmLoader = ({ onTrees, onState }) => {
  const timer = useRef(null);
  const seq = useRef(0);
  const load = useCallback((map) => {
    clearTimeout(timer.current);
    const my = ++seq.current;
    if (map.getZoom() < OSM_ZOOM) return onState("zoom");
    const b = clamp(map.getBounds());
    if (b.s < 49 || b.n > 55.5 || b.w < 14 || b.e > 24.5) return onState("ok");
    let tries = 0;
    const go = () => api.get("/public/osm/trees", { params: b }).then((r) => {
      if (my !== seq.current) return;
      onTrees(r.data.trees);
      if (r.data.complete) return onState("ok");
      tries += 1;
      onState(tries > 8 ? "slow" : "loading");
      if (tries < 60) timer.current = setTimeout(go, 5000);
      else onState("down");
    }).catch(() => my === seq.current && onState("down"));
    go();
  }, [onTrees, onState]);
  const map = useMapEvents({ moveend: () => load(map) });
  useEffect(() => () => clearTimeout(timer.current), []);
  return null;
};

const RoundBtn = ({ onClick, label, children, testId }) => (
  <button type="button" onClick={onClick} aria-label={label} data-testid={testId} className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1B4332] shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:scale-95">{children}</button>
);

const Legend = ({ t }) => (
  <div className="rise pointer-events-auto mt-2 w-60 rounded-2xl bg-white p-4 text-sm shadow-xl" data-testid="map-legend">
    {[["#2D6A4F", t("lgGood")], ["#D97706", t("lgAttention")], ["#E11D48", t("lgDanger")], ["#52B788", t("lgOsm")]].map(([c, l]) => (
      <div key={l} className="flex items-center gap-2 py-1"><span className="h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ background: c }} />{l}</div>
    ))}
    <div className="flex items-center gap-2 py-1"><span className="text-amber-500">★</span>{t("monument")}</div>
    <div className="flex items-center gap-2 py-1"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#0369A1]" />{t("attraction")}</div>
    <div className="flex items-center gap-2 py-1"><span className="h-4 w-4 rounded-full bg-[#B5541C]" />{t("lgCluster")}</div>
  </div>
);

export default function MapHome() {
  const { t } = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const [map, setMap] = useState(null);
  const [pts, setPts] = useState({ trees: [], places: [] });
  const [osm, setOsm] = useState({});
  const [osmState, setOsmState] = useState("zoom");
  const [onlyMon, setOnlyMon] = useState(false);
  const [legend, setLegend] = useState(false);
  const [sel, setSel] = useState(null);
  const [me, setMe] = useState(null);
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const navTo = useNavigate();
  const fitted = useRef("");
  const track = !!user && !!sel && sel.kind !== "place";

  useEffect(() => {
    if (!track || !navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition((p) => setMe([p.coords.latitude, p.coords.longitude]), () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [track]);

  useEffect(() => {
    if (!track || !me || !map || fitted.current === sel.key) return;
    fitted.current = sel.key;
    const mobile = window.innerWidth < 768;
    map.fitBounds([me, [sel.lat, sel.lng]], { paddingTopLeft: [40, mobile ? 150 : 60], paddingBottomRight: [40, mobile ? Math.round(window.innerHeight * 0.47) : 60], maxZoom: 18 });
  }, [track, me, map, sel]);

  const focus = useCallback((it) => {
    setSel(it);
    if (!map) return;
    const mobile = window.innerWidth < 768;
    map.setView([it.lat, it.lng], 18, { animate: false });
    if (mobile) map.panBy([0, Math.round(window.innerHeight * 0.22)], { animate: false });
  }, [map]);

  useEffect(() => {
    const token = sp.get("tree");
    const osmId = sp.get("osm");
    if (!map || (!token && !osmId)) return;
    setSp({}, { replace: true });
    if (osmId) {
      api.get(`/public/osm/trees/${osmId}`).then((r) => focus({ ...r.data, kind: "osm", key: `o-${r.data.osm_id}` })).catch(() => {});
      return;
    }
    api.get(`/public/trees/${token}`).then(({ data: t }) => {
      if (t.lat == null || t.lng == null) return navTo(`/t/${token}`, { replace: true });
      focus({ kind: "tree", key: `t-${token}`, public_token: token, lat: t.lat, lng: t.lng, species: t.species, species_latin: t.species_latin, tag_number: t.tag_number,
        is_monument: t.is_monument, monument_name: t.monument_name, condition: t.condition, photo_path: t.photo_path, gmina_id: t.gmina.id, gmina_name: t.gmina.name, park: t.park });
    }).catch(() => navTo(`/t/${token}`, { replace: true }));
  }, [map, sp, setSp, focus, navTo]);

  useEffect(() => { api.get("/public/map/points").then((r) => setPts(r.data)).catch(() => {}); }, []);
  const addOsm = useCallback((list) => setOsm((o) => {
    if (list.every((x) => o[x.osm_id])) return o;
    const n = { ...o };
    list.forEach((x) => { n[x.osm_id] = x; });
    return n;
  }), []);

  const items = useMemo(() => {
    const trees = pts.trees.filter((x) => !onlyMon || x.is_monument).map((x) => ({ ...x, kind: "tree", key: `t-${x.public_token}` }));
    if (onlyMon) return trees;
    return [...trees, ...pts.places.map((x) => ({ ...x, kind: "place", key: `p-${x.id}` })),
      ...Object.values(osm).map((x) => ({ ...x, kind: "osm", key: `o-${x.osm_id}` }))];
  }, [pts, osm, onlyMon]);

  const locate = useCallback((quiet) => {
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const ll = [p.coords.latitude, p.coords.longitude];
      setMe(ll);
      map.flyTo(ll, 16, { duration: 1.2 });
    }, () => !quiet && toast.error(tRef.current("noLocation")), { timeout: 10000 });
  }, [map]);
  useEffect(() => {
    if (map) navigator.permissions?.query({ name: "geolocation" }).then((p) => p.state === "granted" && locate(true)).catch((e) => console.error("Permission check failed", e));
  }, [map, locate]);
  const pick = useCallback((it) => { setSel(it); map?.panTo([it.lat, it.lng], { animate: true }); }, [map]);

  return (
    <AppShell title={<span className="font-display text-xl">ARBIX</span>} bleed>
      <div className="relative h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] overflow-hidden md:h-[calc(100dvh-3.5rem)]" data-testid="map-home">
        <MapContainer ref={setMap} center={[52.07, 19.48]} zoom={6} minZoom={5} maxZoom={19} zoomControl={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <ClusterLayer items={items} selectedKey={sel?.key} onPick={pick} />
          <OsmLoader onTrees={addOsm} onState={setOsmState} />
          {track && me && <Polyline positions={[me, [sel.lat, sel.lng]]} pathOptions={{ color: "#2563EB", weight: 4, dashArray: "8 10", opacity: 0.85 }} />}
          {me && <CircleMarker center={me} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }} />}
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[800] space-y-2 p-3 md:max-w-xl">
          <div className="pointer-events-auto"><GlobalSearch placeholder={t("search")} /></div>
          <div className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            <button type="button" onClick={() => setOnlyMon(!onlyMon)} data-testid="map-only-monuments"
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-md ${onlyMon ? "bg-[#1B4332] text-white" : "bg-white text-slate-700"}`}><Award className="h-4 w-4" />{t("onlyMonuments")}</button>
            <button type="button" onClick={() => setLegend(!legend)} data-testid="map-legend-toggle"
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-md ${legend ? "bg-[#1B4332] text-white" : "bg-white text-slate-700"}`}><Info className="h-4 w-4" />{t("legend")}</button>
            <Link to="/atrakcje" data-testid="map-attractions-chip" className="inline-flex h-10 shrink-0 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-md">{t("attractions")}</Link>
          </div>
          {legend && <Legend t={t} />}
          {!onlyMon && osmState !== "ok" && (
            <div className="flex justify-center"><span className="inline-flex items-center gap-2 rounded-full bg-[#1B4332]/90 px-4 py-2 text-xs font-semibold text-white shadow" data-testid={`map-osm-${osmState}`}>
              {["loading", "slow"].includes(osmState) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t({ zoom: "zoomHint", loading: "loadingTrees", slow: "osmSlow", down: "osmDown" }[osmState])}
            </span></div>
          )}
        </div>

        <div className="absolute bottom-24 right-3 z-[800] flex flex-col gap-2 md:bottom-6">
          <RoundBtn onClick={() => map?.zoomIn()} label="+" testId="map-zoom-in"><Plus className="h-5 w-5" /></RoundBtn>
          <RoundBtn onClick={() => map?.zoomOut()} label="-" testId="map-zoom-out"><Minus className="h-5 w-5" /></RoundBtn>
          <RoundBtn onClick={() => locate(false)} label={t("locate")} testId="map-locate"><LocateFixed className="h-5 w-5" /></RoundBtn>
        </div>

        {!sel && !["worker", "gmina_admin"].includes(user?.role) && (
          <Link to="/zglos" data-testid="map-report-fab" className="absolute bottom-10 left-1/2 z-[800] inline-flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-[#B5541C] px-6 text-base font-semibold text-white shadow-[0_8px_24px_rgba(181,84,28,0.4)] active:scale-95 md:hidden">
            <AlertTriangle className="h-5 w-5" />{t("reportEvent")}
          </Link>
        )}
        <MapSheet item={sel} me={me} onClose={() => { setSel(null); fitted.current = ""; }} />
      </div>
    </AppShell>
  );
}
