/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { PublicDirectory } from './components/public/PublicDirectory';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WebsitesList } from './components/admin/WebsitesList';
import { WebsiteForm } from './components/admin/WebsiteForm';
import { CategoriesManager } from './components/admin/CategoriesManager';
import { FeaturedManager } from './components/admin/FeaturedManager';
import { SubmissionsManager } from './components/admin/SubmissionsManager';
import { AnalyticsView } from './components/admin/AnalyticsView';
import { SettingsView } from './components/admin/SettingsView';
import { ActivityLogView } from './components/admin/ActivityLogView';
import { seedInitialDataIfEmpty } from './lib/firestoreService';
import { RefreshCw } from 'lucide-react';

const AppRoutes: React.FC = () => {
  const { currentPath, params, navigate } = useNavigation();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Check and seed initial directory data only if database is completely empty
    seedInitialDataIfEmpty();
  }, []);

  // Handle protected admin routes
  if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Authenticating admin session...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <AdminLogin />;
    }
  }

  // Exact Route Matching
  if (currentPath === '/admin/login') {
    return <AdminLogin />;
  }

  if (currentPath === '/admin' || currentPath === '/admin/') {
    return <AdminDashboard />;
  }

  if (currentPath.startsWith('/admin/websites/new')) {
    return <WebsiteForm isEdit={false} />;
  }

  if (currentPath.startsWith('/admin/websites/') && currentPath.endsWith('/edit')) {
    return <WebsiteForm isEdit={true} />;
  }

  if (currentPath.startsWith('/admin/websites')) {
    return <WebsitesList />;
  }

  if (currentPath.startsWith('/admin/categories')) {
    return <CategoriesManager />;
  }

  if (currentPath.startsWith('/admin/featured')) {
    return <FeaturedManager />;
  }

  if (currentPath.startsWith('/admin/submissions')) {
    return <SubmissionsManager />;
  }

  if (currentPath.startsWith('/admin/analytics')) {
    return <AnalyticsView />;
  }

  if (currentPath.startsWith('/admin/settings')) {
    return <SettingsView />;
  }

  if (currentPath.startsWith('/admin/activity')) {
    return <ActivityLogView />;
  }

  // Public Directory (Default fallback for / and any other route)
  return <PublicDirectory />;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppRoutes />
        </NavigationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
