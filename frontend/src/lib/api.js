import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// Session is an httpOnly cookie; X-Requested-With is required by the backend CSRF guard.
export const api = axios.create({ baseURL: API, withCredentials: true, headers: { "X-Requested-With": "arbix" } });

export const errMsg = (e, fallback = "Wystąpił błąd. Spróbuj ponownie.") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return "Sprawdź poprawność wypełnionych pól";
  return fallback;
};

export const fileUrl = (path) => {
  if (!path) return null;
  return `${API}/files/${path}`;
};

export const downloadBlob = async (url, filename) => {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
};

export const validPesel = (p) => {
  if (!/^\d{11}$/.test(p)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const s = w.reduce((acc, wi, i) => acc + wi * Number(p[i]), 0);
  return (10 - (s % 10)) % 10 === Number(p[10]);
};

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("pl-PL") : "—");

export const imgOf = (item) => (item?.photo_path ? fileUrl(item.photo_path) : item?.image_url || null);
