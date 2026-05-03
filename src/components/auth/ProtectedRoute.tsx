import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export function ProtectedRoute({
  children,
  requireAdmin = false,
  unauthedRedirect = "/login",
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  unauthedRedirect?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to={unauthedRedirect} replace />;
  }

  if (requireAdmin) {
    const ADMIN_EMAIL = "alexandre.n.bridi@gmail.com";
    const isAdmin = user.email === ADMIN_EMAIL;
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
