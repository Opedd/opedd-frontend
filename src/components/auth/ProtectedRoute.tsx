import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      <aside className="hidden lg:flex w-[220px] bg-white border-r border-[#E5E7EB] flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB]">
          <div className="h-7 w-24 bg-[#E5E7EB] rounded animate-pulse" />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 h-9 px-3 mx-1">
              <div className="w-4 h-4 bg-[#E5E7EB] rounded animate-pulse" />
              <div className="h-3.5 bg-[#E5E7EB] rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#E5E7EB] bg-white">
          <div className="h-4 w-28 bg-[#E5E7EB] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E5E7EB] rounded-lg animate-pulse" />
            <div className="w-9 h-9 bg-[#E5E7EB] rounded-full animate-pulse" />
          </div>
        </header>
        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 min-h-[120px]">
              <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 min-h-[120px]">
              <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse mb-3" />
              <div className="h-8 w-20 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 min-h-[200px]">
            <div className="h-4 w-32 bg-[#E5E7EB] rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-3 w-full bg-[#E5E7EB] rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-[#E5E7EB] rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
