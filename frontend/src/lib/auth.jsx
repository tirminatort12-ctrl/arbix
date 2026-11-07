import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);
const EMPTY = { loading: false, user: null, gmina: null };

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ ...EMPTY, loading: true });

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setState({ loading: false, user: data.user, gmina: data.gmina });
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Session check failed", e);
      setState(EMPTY);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Session lives in an httpOnly cookie set by the backend; the token argument is not stored.
  const signIn = async () => { await refresh(); };
  const signOut = async () => {
    try { await api.post("/auth/logout"); } catch (e) { console.error("Logout failed", e); }
    setState(EMPTY);
  };

  return <AuthCtx.Provider value={{ ...state, refresh, signIn, signOut }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
