import { Navigate } from "react-router-dom";
import Shell from "@/components/Shell";
import { useAuth } from "@/lib/auth";
import WorkerHome from "@/pages/WorkerHome";
import AdminHome from "@/pages/AdminHome";
import OwnerHome from "@/pages/OwnerHome";

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "resident") return <Navigate to="/zgloszenia" replace />;
  const wide = user.role === "gmina_admin" || user.role === "owner";
  const Page = { worker: WorkerHome, gmina_admin: AdminHome, owner: OwnerHome }[user.role];
  return <Shell wide={wide}><Page /></Shell>;
}
