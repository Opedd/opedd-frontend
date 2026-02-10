import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import Ledger from "./pages/Ledger";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Checkout from "./pages/Checkout";
import LicenseCheckout from "./pages/LicenseCheckout";
import LicenseSuccess from "./pages/LicenseSuccess";
import NotFound from "./pages/NotFound";
import LicensePublicCheckout from "./pages/LicensePublicCheckout";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout/:assetId" element={<Checkout />} />
            <Route path="/license/success" element={<LicenseSuccess />} />
            <Route path="/license/:id" element={<LicenseCheckout />} />
            <Route path="/l/:id" element={<LicensePublicCheckout />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
