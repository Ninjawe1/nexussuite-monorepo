import React, { useEffect } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

// Contexts
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

// Pages
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import Players from "@/pages/players";
import Finance from "@/pages/finance";
import Analytics from "@/pages/analytics";
import Dashboard from "@/pages/dashboard";
import TournamentsPage from "@/pages/tournaments";
import Matches from "@/pages/matches";
import Payroll from "@/pages/payroll";
import Settings from "@/pages/settings";
import OrgSettings from "@/pages/org-settings";
import MembersManagement from "@/pages/MembersManagement";
import InviteAccept from "@/pages/invite-accept";
import Team from "@/pages/team";
import Marcom from "@/pages/marcom";
import Contracts from "@/pages/contracts";
import Audit from "@/pages/audit";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { SubscriptionDashboard } from "@/components/SubscriptionDashboard";
import Landing from "@/pages/landing";
import ProfilePage from "@/pages/profile";

// Components
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/DashboardLayout";

// Services
import { queryClient } from "@/lib/queryClient";

// Create a single query client instance
const queryClientInstance = queryClient;

/**
 * Protected Route Component
 * Ensures user is authenticated before rendering children
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // This will be handled by AuthProvider
  return <>{children}</>;
};

/**
 * Admin Route Component
 * Ensures user has system admin role
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This will be handled by AuthProvider and AdminDashboard
  return <>{children}</>;
};

// Redirect helper component for wouter
const Redirect: React.FC<{ to: string }> = ({ to }) => {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
};

/**
 * Main App Component
 */
function App() {
  const [location] = useLocation();
  const isLanding = location === "/";
  // Public routes that should get balanced padding via main wrapper
  const isPublicRoute = location === "/login" || location === "/register";
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const theme = savedTheme || systemTheme;

    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <OrganizationProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              {/* Main content */}
              {/* Apply padding only for public routes; dashboard routes rely on DashboardLayout spacing */}
              <main className={
                isLanding
                  ? ""
                  : isPublicRoute
                  ? "container mx-auto px-4 md:px-6 py-6"
                  : ""
              }>
                <Switch>
                  {/* Public routes */}
                  <Route path="/login">
                    <Login />
                  </Route>
                  <Route path="/register">
                    <Register />
                  </Route>
                  <Route path="/invite/:token">
                    <ProtectedRoute>
                      <InviteAccept />
                    </ProtectedRoute>
                  </Route>

                  {/* Protected routes */}
                  <Route path="/dashboard">
                    <ProtectedRoute>
                      <DashboardLayout>
                        {/* Restored NexusSuite overview dashboard */}
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Profile route */}
                  <Route path="/profile">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ProfilePage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Billing page */}
                  <Route path="/billing">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <div className="max-w-6xl mx-auto p-6">
                          <h1 className="text-3xl font-bold mb-6">
                            Billing & Subscription
                          </h1>
                          <SubscriptionDashboard />
                        </div>
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Primary app routes */}
                  <Route path="/players">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Players />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/rosters">
                    <ProtectedRoute>
                      <DashboardLayout>
                        {/* Using Players Rosters tab for now */}
                        <Players />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/finance">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Finance />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Payroll route */}
                  <Route path="/payroll">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Payroll />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/analytics">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Analytics />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/tournaments">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <TournamentsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/matches">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Matches />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Team management route */}
                  <Route path="/team">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Team />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Marketing & Communications route */}
                  <Route path="/marcom">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Marcom />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Contracts management route */}
                  <Route path="/contracts">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Contracts />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Organization settings subpage */}
                  <Route path="/organization">
                    {/* Redirect legacy organization route to unified Settings */}
                    <Redirect to="/settings" />
                  </Route>
                  <Route path="/settings/organization">
                    {/* Redirect legacy nested organization settings to unified Settings */}
                    <Redirect to="/settings" />
                  </Route>

                  {/* Settings root route */}
                  <Route path="/settings">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Organization Settings route within dashboard */}
                  <Route path="/dashboard/org/settings">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <OrgSettings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Organization Members management */}
                  <Route path="/dashboard/org/members">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MembersManagement />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Organization Billing */}
                  <Route path="/dashboard/org/billing">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <div className="max-w-6xl mx-auto p-6">
                          <h1 className="text-3xl font-bold mb-6">
                            Billing & Subscription
                          </h1>
                          <SubscriptionDashboard />
                        </div>
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Audit Log route alias to match requested path */}
                  <Route path="/audit-log">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Audit />
                      </DashboardLayout>
                    </ProtectedRoute>
                  </Route>

                  {/* Admin routes */}
                  <Route path="/admin">
                    <AdminRoute>
                      <DashboardLayout>
                        <AdminDashboard />
                      </DashboardLayout>
                    </AdminRoute>
                  </Route>

                  {/* Public landing page at root */}
                  <Route path="/">
                    <Landing />
                  </Route>

                  {/* 404 */}
                  <Route>
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-2">404</h1>
                        <p className="text-muted-foreground mb-4">
                          Page not found
                        </p>
                        <a
                          href="/dashboard"
                          className="text-primary hover:underline"
                        >
                          Go to Dashboard
                        </a>
                      </div>
                    </div>
                  </Route>
                </Switch>
              </main>
            </div>
          </Router>

          {/* Global toast notifications */}
          <Toaster />
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
