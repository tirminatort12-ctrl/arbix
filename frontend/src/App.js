import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Common";
import MapHome from "@/pages/MapHome";
import Report from "@/pages/Report";
import DiscoverHome from "@/pages/DiscoverHome";
import AppShell from "@/components/AppShell";
import { LangProvider } from "@/lib/i18n";
import Scan from "@/pages/Scan";
import Profile from "@/pages/Profile";
import MyReports from "@/pages/MyReports";
import Attractions from "@/pages/Attractions";
import News from "@/pages/News";
import { PlaceDetail, NewsDetail } from "@/pages/Details";
import { ParkPage, GminaPage } from "@/pages/Places";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Activate from "@/pages/Activate";
import PublicTree from "@/pages/PublicTree";
import ParkMap from "@/pages/ParkMap";
import WorkerTree from "@/pages/WorkerTree";
import Dashboard from "@/pages/Dashboard";
import PaymentResult from "@/pages/PaymentResult";

const Protected = ({ children }) => {
  const { loading, user } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
};

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <div className="App">
      <LangProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<MapHome />} />
            <Route path="/zglos" element={<Report />} />
            <Route path="/odkrywaj" element={<AppShell title="Odkrywaj" wide><DiscoverHome /></AppShell>} />
            <Route path="/skanuj" element={<Scan />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/zgloszenia" element={<MyReports />} />
            <Route path="/atrakcje" element={<Attractions />} />
            <Route path="/park/:id" element={<ParkPage />} />
            <Route path="/gmina/:gid" element={<GminaPage />} />
            <Route path="/atrakcje/:id" element={<PlaceDetail />} />
            <Route path="/aktualnosci" element={<News />} />
            <Route path="/aktualnosci/:id" element={<NewsDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/activate" element={<Activate />} />
            <Route path="/mapa" element={<ParkMap />} />
            <Route path="/t/:token" element={<PublicTree />} />
            <Route path="/w/:key" element={<Protected><WorkerTree /></Protected>} />
            <Route path="/staff/trees/:key" element={<Protected><WorkerTree /></Protected>} />
            <Route path="/app" element={<Protected><Dashboard /></Protected>} />
            <Route path="/payment/success" element={<Protected><PaymentResult ok /></Protected>} />
            <Route path="/payment/cancel" element={<Protected><PaymentResult /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </BrowserRouter>
      </LangProvider>
    </div>
  );
}

export default App;
