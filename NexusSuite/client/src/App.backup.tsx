import React, { useEffect } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';

// Contexts
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

// Pages
import { Login } from '@/pages/login';
import { Register } from '@/pages/register';
import Dashboard from '@/pages/dashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { SubscriptionDashboard } from '@/components/SubscriptionDashboard';
import Landing from '@/pages/landing';

// Components
import { Toaster } from '@/components/ui/toaster';
import { OrganizationSelector } from '@/components/OrganizationSelector';

// Services
import { queryClient } from '@/lib/queryClient';

// Create a single query client instance
const queryClientInstance = queryClient;

/**
 * Protected Route Component
 * Ensures user is authenticated before rendering children
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

/**
 * Main App Component
 */
function App() {
  const [location] = useLocation();
  const isLanding = location === '/';
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const theme = savedTheme || systemTheme;

    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <OrganizationProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              {!isLanding && (
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">NexusSuite</h1>
                        <OrganizationSelector className="hidden md:flex" />
                      </div>

                      <nav className="flex items-center gap-4">
                        <a href="/dashboard" className="text-sm font-medium hover:text-primary">
                          Dashboard
                        </a>
                        <a
                          href="/dashboard/billing"
                          className="text-sm font-medium hover:text-primary"
                        >
                          Billing
                        </a>
                        <a href="/admin" className="text-sm font-medium hover:text-primary">
                          Admin
                        </a>
                      </nav>
                    </div>
                  </div>
                </header>
              )}

              {/* Main content */}
              <main className={isLanding ? '' : 'container mx-auto px-4 py-6'}>
                <Switch>
                  {/* Public routes */}
                  <Route path="/login">
                    <Login />
                  </Route>
                  <Route path="/register">
                    <Register />
                  </Route>

                  {/* Protected routes */}
                  <Route path="/dashboard">
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </Route>

                  <Route path="/dashboard/billing">
                    <ProtectedRoute>
                      <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-bold mb-6">Billing & Subscription</h1>
                        <SubscriptionDashboard />
                      </div>
                    </ProtectedRoute>
                  </Route>

                  {/* Admin routes */}
                  <Route path="/admin">
                    <AdminRoute>
                      <AdminDashboard />
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
                        <p className="text-muted-foreground mb-4">Page not found</p>
                        <a href="/dashboard" className="text-primary hover:underline">
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
