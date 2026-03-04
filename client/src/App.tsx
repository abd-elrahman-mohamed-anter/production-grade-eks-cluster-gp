import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import UserMenu from "@/components/UserMenu";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ScanProvider } from "@/lib/scan-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScanNow from "@/pages/ScanNow";
import ScanDetails from "@/pages/ScanDetails";
import Scheduling from "@/pages/Scheduling";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import AboutUs from "@/pages/AboutUs";
import FAQ from "@/pages/FAQ";
import CompareScans from "@/pages/CompareScans";

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <UserMenu
              onProfileClick={() => setLocation("/settings")}
              onApiKeysClick={() => setLocation("/settings")}
            />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/scan" component={ScanNow} />
              <Route path="/compare" component={CompareScans} />
              <Route path="/scans/:id" component={ScanDetails} />
              <Route path="/scheduling" component={Scheduling} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route path="/about-us" component={AboutUs} />
              <Route path="/about" component={About} />
              <Route path="/faq" component={FAQ} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <footer className="px-4 py-2 border-t border-border bg-background">
            <p className="text-xs text-muted-foreground text-center">Version 1.2025 Vulnerability Scanner</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="zap-scanner-theme">
        <TooltipProvider>
          <AuthProvider>
            <ScanProvider>
              <ProtectedRouter />
              <Toaster />
            </ScanProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
