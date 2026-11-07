import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const KEY = "arbotag_gmina";

export const useGmina = () => {
  const { user } = useAuth();
  const [gminas, setGminas] = useState([]);
  const [sel, setSel] = useState(localStorage.getItem(KEY) || "");
  useEffect(() => { api.get("/public/gminas").then((r) => setGminas(r.data)).catch((e) => console.error("Failed to load gminas", e)); }, []);
  const gid = user?.gmina_id || gminas.find((g) => g.id === sel)?.id || gminas[0]?.id;
  // Only the chosen gmina id (public, non-sensitive) is remembered on the device.
  const choose = useCallback((id) => { localStorage.setItem(KEY, id); setSel(id); }, []);
  return { gid, gminas, choose, gmina: gminas.find((g) => g.id === gid) };
};

export const useMapData = (gid) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!gid) return;
    setData(null);
    api.get(`/public/gminas/${gid}/map`).then((r) => setData(r.data)).catch(() => setData({ trees: [], parks: [], gmina: {} }));
  }, [gid]);
  return data;
};

export const usePublicList = (gid, kind, limit = 100) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!gid) return;
    api.get(`/public/gminas/${gid}/${kind}?limit=${limit}`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [gid, kind, limit]);
  return items;
};
