import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Core dashboard routes — eagerly loaded (always needed after login)
import Dashboard from "./pages/Dashboard";
import Content from "./pages/Content";
import Licensing from "./pages/Licensing";
import Ledger from "./pages/Ledger";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";

// Auth pages — eagerly loaded (needed before dashboard)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import UpdatePassword from "./pages/UpdatePassword";

// Lazy-loaded: public marketing pages (heavy, rarely needed after login)
const Index = lazy(() => import("./pages/Index"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ForAiAgents = lazy(() => import("./pages/ForAiAgents"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Status = lazy(() => import("./pages/Status"));

// Lazy-loaded: buyer-facing public pages
const LicensePublicCheckout = lazy(() => import("./pages/LicensePublicCheckout"));
const LicenseByUrl = lazy(() => import("./pages/LicenseByUrl"));
const LicenseVerify = lazy(() => import("./pages/LicenseVerify"));
const LicenseSuccess = lazy(() => import("./pages/LicenseSuccess"));
const PublisherLicensingPage = lazy(() => import("./pages/PublisherLicensingPage"));
const ArchiveLicenseCheckout = lazy(() => import("./pages/ArchiveLicenseCheckout"));
const Licenses = lazy(() => import("./pages/Licenses"));
const MyLicenses = lazy(() => import("./pages/MyLicenses"));

// Lazy-loaded: infrequent dashboard routes
const Connectors = lazy(() => import("./pages/Connectors"));
const Payments = lazy(() => import("./pages/Payments"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const WidgetPreview = lazy(() => import("./pages/WidgetPreview"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-6 w-6 animate-spin text-[#4A26ED]" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
                <Route path="/licensing" element={<ProtectedRoute><Licensing /></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
                <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
                <Route path="/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                {/* Redirect old routes */}
                <Route path="/integrations" element={<Navigate to="/connectors" replace />} />
                <Route path="/license/success" element={<LicenseSuccess />} />
                <Route path="/p/:publisherSlug" element={<PublisherLicensingPage />} />
                <Route path="/l/:id" element={<LicensePublicCheckout />} />
                <Route path="/l" element={<LicenseByUrl />} />
                <Route path="/verify" element={<LicenseVerify />} />
                <Route path="/verify/:key" element={<LicenseVerify />} />
                <Route path="/widget-preview" element={<WidgetPreview />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/licenses" element={<Licenses />} />
                <Route path="/my-licenses" element={<MyLicenses />} />
                <Route path="/archive/:publisher_id" element={<ArchiveLicenseCheckout />} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/for-ai-agents" element={<ForAiAgents />} />
                <Route path="/status" element={<Status />} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
