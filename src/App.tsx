import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { RegionalSettingsProvider } from "@/contexts/RegionalSettingsContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { ProductTourProvider } from "@/contexts/ProductTourContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { PermissionRoute } from "@/components/PermissionRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CashierDashboard from "./pages/CashierDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import MySales from "./pages/MySales";
import Checkout from "./pages/Checkout";
import SalesHistory from "./pages/SalesHistory";
import Customers from "./pages/Customers";
import Branches from "./pages/Branches";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import OnboardingWizard from "./pages/OnboardingWizard";
import ProfileSettings from "./pages/ProfileSettings";
import UserGuide from "./pages/UserGuide";
import AdminDashboard from "./pages/AdminDashboard";
import SalesPitch from "./pages/SalesPitch";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentTerminal from "./pages/PaymentTerminal";
import AuditLog from "./pages/AuditLog";
import ShiftHistory from "./pages/ShiftHistory";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes for offline access
      gcTime: 30 * 60 * 1000,
      // Retry failed requests when network is available
      retry: (failureCount, error) => {
        // Don't retry if we're offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      // Use cached data while refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OfflineProvider>
        <RegionalSettingsProvider>
          <CurrencyProvider>
            <BranchProvider>
              <ProductTourProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/pitch" element={<SalesPitch />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<OnboardingWizard />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/cashier-dashboard" element={<ProtectedRoute><CashierDashboard /></ProtectedRoute>} />
                  <Route path="/staff-dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
                  <Route path="/manager-dashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
                  <Route path="/my-sales" element={<ProtectedRoute><MySales /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/payment-terminal" element={<ProtectedRoute><PaymentTerminal /></ProtectedRoute>} />
                  <Route path="/sales" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
                  <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                  <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                  <Route path="/suppliers" element={<ProtectedRoute><PermissionRoute anyOf={["access_suppliers"]}><Suppliers /></PermissionRoute></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                  <Route path="/guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
                  <Route path="/shift-history" element={<ProtectedRoute><ShiftHistory /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </TooltipProvider>
            </ProductTourProvider>
          </BranchProvider>
        </CurrencyProvider>
      </RegionalSettingsProvider>
      </OfflineProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
