import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { RegionalSettingsProvider } from "@/contexts/RegionalSettingsContext";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import SalesHistory from "./pages/SalesHistory";
import Customers from "./pages/Customers";
import Branches from "./pages/Branches";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RegionalSettingsProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/sales-history" element={<SalesHistory />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </RegionalSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
