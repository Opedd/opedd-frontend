import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import Ledger from "./pages/Ledger";
import Connectors from "./pages/Connectors";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Content from "./pages/Content";
import LicenseSuccess from "./pages/LicenseSuccess";
import NotFound from "./pages/NotFound";
import LicensePublicCheckout from "./pages/LicensePublicCheckout";
import LicenseByUrl from "./pages/LicenseByUrl";
import LicenseVerify from "./pages/LicenseVerify";
import WidgetPreview from "./pages/WidgetPreview";
import AcceptInvite from "./pages/AcceptInvite";
import Onboarding from "./pages/Onboarding";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import AuthCallback from "./pages/AuthCallback";
import Licenses from "./pages/Licenses";
import Licensing from "./pages/Licensing";
import PublisherLicensingPage from "./pages/PublisherLicensingPage";

import ForAiAgents from "./pages/ForAiAgents";
import Admin from "./pages/Admin";
import Status from "./pages/Status";
import MyLicenses from "./pages/MyLicenses";
import ArchiveLicenseCheckout from "./pages/ArchiveLicenseCheckout";
import Enterprise from "./pages/Enterprise";
import NotificationsPage from "./pages/NotificationsPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/my-licenses" element={<Navigate to="/licenses" replace />} />
              
              <Route path="/archive/:publisher_id" element={<ArchiveLicenseCheckout />} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/for-ai-agents" element={<ForAiAgents />} />
              <Route path="/status" element={<Status />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
