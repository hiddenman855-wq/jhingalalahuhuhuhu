import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RouteParams {
  id?: string;
  categorySlug?: string;
  status?: string;
}

interface NavigationContextValue {
  currentPath: string;
  params: RouteParams;
  navigate: (path: string) => void;
  isAdminRoute: boolean;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Extract params
  const params: RouteParams = {};
  if (currentPath.startsWith('/admin/websites/') && currentPath.endsWith('/edit')) {
    const parts = currentPath.split('/');
    params.id = parts[3];
  } else if (currentPath.startsWith('/category/')) {
    params.categorySlug = currentPath.split('/')[2];
  }

  const isAdminRoute = currentPath.startsWith('/admin');

  return (
    <NavigationContext.Provider value={{ currentPath, params, navigate, isAdminRoute }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
