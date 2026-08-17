import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { HomePage } from '@/pages/HomePage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminRecordsPage } from '@/pages/admin/AdminRecordsPage';
import { AdminDrugsPage } from '@/pages/admin/AdminDrugsPage';
import { AdminTagsPage } from '@/pages/admin/AdminTagsPage';
import { AdminRhetoricPage } from '@/pages/admin/AdminRhetoricPage';
import { AdminUrlQueriesPage } from '@/pages/admin/AdminUrlQueriesPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AdminLayout } from '@/components/layout/AdminLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground selection:bg-primary selection:text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Admin Routes */}
        <Route path="/admin/login">
          <AdminLoginPage />
        </Route>
        
        <Route path="/admin">
          <AdminLayout><AdminDashboard /></AdminLayout>
        </Route>
        <Route path="/admin/records">
          <AdminLayout><AdminRecordsPage /></AdminLayout>
        </Route>
        <Route path="/admin/drugs">
          <AdminLayout><AdminDrugsPage /></AdminLayout>
        </Route>
        <Route path="/admin/tags">
          <AdminLayout><AdminTagsPage /></AdminLayout>
        </Route>
        <Route path="/admin/rhetoric">
          <AdminLayout><AdminRhetoricPage /></AdminLayout>
        </Route>
        <Route path="/admin/url-queries">
          <AdminLayout><AdminUrlQueriesPage /></AdminLayout>
        </Route>
        <Route path="/admin/users">
          <AdminLayout><AdminUsersPage /></AdminLayout>
        </Route>

        {/* Public Routes */}
        <Route path="/">
          <PublicLayout><HomePage /></PublicLayout>
        </Route>
        <Route path="/history">
          <PublicLayout><HistoryPage /></PublicLayout>
        </Route>
        
        {/* Fallback */}
        <Route>
          <PublicLayout><NotFound /></PublicLayout>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
