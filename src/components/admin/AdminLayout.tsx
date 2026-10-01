import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  PlusCircle, 
  FileText, 
  EyeOff, 
  FolderTree, 
  Sparkles, 
  Inbox, 
  BarChart3, 
  Settings, 
  History, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions
}) => {
  const { user, logout } = useAuth();
  const { currentPath, navigate } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [websitesSubmenuOpen, setWebsitesSubmenuOpen] = useState(true);

  const isWebsitesActive = currentPath.startsWith('/admin/websites');

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { 
      label: 'Websites', 
      isParent: true,
      active: isWebsitesActive,
      children: [
        { label: 'All Websites', path: '/admin/websites', icon: Globe },
        { label: 'Add Website', path: '/admin/websites/new', icon: PlusCircle },
        { label: 'Drafts', path: '/admin/websites?status=draft', icon: FileText },
        { label: 'Disabled', path: '/admin/websites?status=disabled', icon: EyeOff },
      ]
    },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Featured', path: '/admin/featured', icon: Sparkles },
    { label: 'Submissions', path: '/admin/submissions', icon: Inbox },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: 'Activity Log', path: '/admin/activity', icon: History },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-indigo-500/20">
            IH
          </div>
          <div>
            <span className="font-semibold tracking-tight text-slate-100 text-sm block">IndexHub Admin</span>
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">CMS Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
            title="View Public Directory"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 md:bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 backdrop-blur-md md:backdrop-blur-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20 text-base">
              IH
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-100 text-base leading-tight">IndexHub</h1>
              <p className="text-xs text-indigo-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Directory CMS
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 pt-1">
            Management
          </div>

          {navItems.map((item, idx) => {
            if (item.isParent && item.children) {
              return (
                <div key={idx} className="space-y-1">
                  <button
                    onClick={() => setWebsitesSubmenuOpen(!websitesSubmenuOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.active
                        ? 'bg-slate-800/90 text-indigo-300'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>{item.label}</span>
                    </div>
                    {websitesSubmenuOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {websitesSubmenuOpen && (
                    <div className="pl-6 space-y-1">
                      {item.children.map((sub, sIdx) => {
                        const isSubActive = currentPath === sub.path || (sub.path.includes('?') && currentPath + window.location.search === sub.path);
                        const Icon = sub.icon;
                        return (
                          <button
                            key={sIdx}
                            onClick={() => handleNavClick(sub.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              isSubActive
                                ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = currentPath === item.path;

            return (
              <button
                key={idx}
                onClick={() => handleNavClick(item.path!)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Public site link & User profile */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900/50">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Public Directory
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.displayName || 'Administrator'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email || 'admin@example.com'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-slate-900/70 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-100">{title}</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> Admin Only
                </span>
              </div>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>

        {/* Main Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden"
        />
      )}
    </div>
  );
};
