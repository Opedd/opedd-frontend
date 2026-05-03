import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Suspense, lazy } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { HelmetProvider } from "react-helmet-async";

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
const Publishers = lazy(() => import("./pages/Publishers"));
const Guides = lazy(() => import("./pages/Guides"));
const WordPressGuide = lazy(() => import("./pages/guides/WordPressGuide"));
const GhostGuide = lazy(() => import("./pages/guides/GhostGuide"));
const SubstackGuide = lazy(() => import("./pages/guides/SubstackGuide"));
const BeehiivGuide = lazy(() => import("./pages/guides/BeehiivGuide"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

// Lazy-loaded: buyer-facing public pages
const LicensePublicCheckout = lazy(() => import("./pages/LicensePublicCheckout"));
const LicenseByUrl = lazy(() => import("./pages/LicenseByUrl"));
const LicenseVerify = lazy(() => import("./pages/LicenseVerify"));
const LicenseSuccess = lazy(() => import("./pages/LicenseSuccess"));
const PublisherLicensingPage = lazy(() => import("./pages/PublisherLicensingPage"));
const Licenses = lazy(() => import("./pages/Licenses"));
const MyLicenses = lazy(() => import("./pages/MyLicenses"));

// Lazy-loaded: infrequent dashboard routes
const SetupV2 = lazy(() => import("./pages/SetupV2"));
const Welcome = lazy(() => import("./pages/Welcome"));

// Phase 5.2.2: buyer dashboard at /buyer/* (signup, account, keys)
const BuyerSignup = lazy(() => import("./pages/buyer/BuyerSignup"));
const BuyerAccount = lazy(() => import("./pages/buyer/BuyerAccount"));
const BuyerKeys = lazy(() => import("./pages/buyer/BuyerKeys"));

/**
 * Phase 3 Session 3.1 loop-fix legacy: any visit to /setup (old
 * bookmarks, external links, callers we missed) redirects to /setup-v2
 * with the query string preserved. `replace` so back-button doesn't
 * poison history. The legacy `Setup.tsx` page that motivated this
 * redirect was deleted in Phase 3 Session 3.7; the alias is preserved
 * because /setup remains a stable URL for external references.
 */
function SetupRedirect() {
  const location = useLocation();
  return <Navigate to={`/setup-v2${location.search}${location.hash}`} replace />;
}
const Connectors = lazy(() => import("./pages/Connectors"));

const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const WidgetPreview = lazy(() => import("./pages/WidgetPreview"));
const Admin = lazy(() => import("./pages/Admin"));
const Dmca = lazy(() => import("./pages/Dmca"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner size="md" className="text-oxford" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
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
                <Route path="/distribution" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
                <Route path="/payments" element={<Navigate to="/settings?tab=billing" replace />} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/connectors" element={<Navigate to="/distribution" replace />} />
                <Route path="/integrations" element={<Navigate to="/distribution" replace />} />
                <Route path="/license/success" element={<LicenseSuccess />} />
                <Route path="/p/:publisherSlug" element={<PublisherLicensingPage />} />
                <Route path="/l/:id" element={<LicensePublicCheckout />} />
                <Route path="/l" element={<LicenseByUrl />} />
                <Route path="/verify" element={<LicenseVerify />} />
                <Route path="/verify/:key" element={<LicenseVerify />} />
                <Route path="/widget-preview" element={<WidgetPreview />} />
                <Route path="/setup-v2" element={<ProtectedRoute><SetupV2 /></ProtectedRoute>} />
                <Route path="/setup" element={<SetupRedirect />} />
                <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />

                {/* Phase 5.2.2: buyer dashboard routes. /buyer/signup is public (entry);
                    /buyer/account + /buyer/keys are JWT-gated via ProtectedRoute.
                    Per OQ-3 lenient cohabitation, ProtectedRoute checks Supabase JWT only —
                    buyer pages handle "JWT valid + no enterprise_buyers row" by redirecting
                    to /buyer/signup themselves. */}
                <Route path="/buyer/signup" element={<BuyerSignup />} />
                <Route path="/buyer/account" element={<ProtectedRoute unauthedRedirect="/buyer/signup"><BuyerAccount /></ProtectedRoute>} />
                <Route path="/buyer/keys" element={<ProtectedRoute unauthedRedirect="/buyer/signup"><BuyerKeys /></ProtectedRoute>} />
                <Route path="/buyer" element={<Navigate to="/buyer/account" replace />} />

                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/licenses" element={<Licenses />} />
                <Route path="/my-licenses" element={<MyLicenses />} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/for-ai-agents" element={<ForAiAgents />} />
                <Route path="/docs" element={<Navigate to="/for-ai-agents" replace />} />
                <Route path="/status" element={<Status />} />
                <Route path="/publishers" element={<Publishers />} />
                <Route path="/guides" element={<Guides />} />
                <Route path="/guides/wordpress" element={<WordPressGuide />} />
                <Route path="/guides/ghost" element={<GhostGuide />} />
                <Route path="/guides/substack" element={<SubstackGuide />} />
                <Route path="/guides/beehiiv" element={<BeehiivGuide />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
                <Route path="/dmca" element={<Dmca />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </HelmetProvider>
);

export default App;
