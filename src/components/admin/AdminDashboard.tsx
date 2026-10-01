import React, { useEffect, useState } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  FileText, 
  EyeOff, 
  FolderTree, 
  Sparkles, 
  Inbox, 
  MousePointerClick, 
  PlusCircle, 
  ArrowUpRight, 
  Clock, 
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigation } from '../../context/NavigationContext';
import { 
  fetchWebsites, 
  fetchCategories, 
  fetchSubmissions, 
  fetchActivityLogs 
} from '../../lib/firestoreService';
import { Website, Category, Submission, ActivityLog } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { navigate } = useNavigation();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, c, s, a] = await Promise.all([
        fetchWebsites(),
        fetchCategories(),
        fetchSubmissions(),
        fetchActivityLogs(8)
      ]);
      setWebsites(w);
      setCategories(c);
      setSubmissions(s);
      setRecentActivity(a);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats strictly from real data
  const totalWebsites = websites.length;
  const activeWebsites = websites.filter(w => w.status === 'active').length;
  const draftWebsites = websites.filter(w => w.status === 'draft').length;
  const disabledWebsites = websites.filter(w => w.status === 'disabled').length;
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.active).length;
  const featuredWebsites = websites.filter(w => w.featured).length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const totalClicks = websites.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

  // Recent 5 websites
  const recentWebsites = [...websites]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'Total Websites', value: totalWebsites, icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', link: '/admin/websites' },
    { label: 'Active Websites', value: activeWebsites, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', link: '/admin/websites?status=active' },
    { label: 'Draft Websites', value: draftWebsites, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', link: '/admin/websites?status=draft' },
    { label: 'Disabled Websites', value: disabledWebsites, icon: EyeOff, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', link: '/admin/websites?status=disabled' },
    { label: 'Total Categories', value: totalCategories, icon: FolderTree, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', link: '/admin/categories' },
    { label: 'Active Categories', value: activeCategories, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', link: '/admin/categories' },
    { label: 'Featured Websites', value: featuredWebsites, icon: Sparkles, color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', link: '/admin/featured' },
    { label: 'Pending Submissions', value: pendingSubmissions, icon: Inbox, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', link: '/admin/submissions' },
    { label: 'Total Clicks', value: totalClicks, icon: MousePointerClick, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', link: '/admin/analytics' },
  ];

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Overview of directory listings, categories, clicks, and recent changes."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate('/admin/websites/new')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-900/30 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Website</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Quick Action Buttons */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/admin/websites/new')}
              className="flex items-center justify-between p-3 rounded-lg bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/25 text-indigo-300 transition-colors text-left group"
            >
              <div>
                <span className="text-xs font-bold block text-white">+ Add Website</span>
                <span className="text-[11px] text-indigo-400">New directory entry</span>
              </div>
              <PlusCircle className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/admin/categories')}
              className="flex items-center justify-between p-3 rounded-lg bg-teal-600/15 border border-teal-500/30 hover:bg-teal-600/25 text-teal-300 transition-colors text-left group"
            >
              <div>
                <span className="text-xs font-bold block text-white">+ Add Category</span>
                <span className="text-[11px] text-teal-400">Create classification</span>
              </div>
              <PlusCircle className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/admin/websites')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 transition-colors text-left group"
            >
              <div>
                <span className="text-xs font-bold block text-white">Manage Websites</span>
                <span className="text-[11px] text-slate-400">View, edit, duplicate</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/admin/categories')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 transition-colors text-left group"
            >
              <div>
                <span className="text-xs font-bold block text-white">Manage Categories</span>
                <span className="text-[11px] text-slate-400">Reorder & configure</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Real Statistics Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Directory Statistics
            </h3>
            {loading && <span className="text-xs text-indigo-400 animate-pulse">Syncing with Firestore...</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  onClick={() => navigate(stat.link)}
                  className={`bg-slate-900/60 border ${stat.border} rounded-xl p-4 cursor-pointer hover:bg-slate-900 transition-all hover:scale-[1.02] flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                    <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold tracking-tight text-slate-100">
                      {loading ? '-' : stat.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dual Column: Recent Websites & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Websites */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                Recent Websites
              </h4>
              <button
                onClick={() => navigate('/admin/websites')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View all ({totalWebsites})
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-800/60 flex-1">
              {recentWebsites.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No websites yet. Click + Add Website to create one.</p>
              ) : (
                recentWebsites.map(site => {
                  const statusColors = {
                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    draft: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    disabled: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }[site.status];

                  return (
                    <div key={site.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {site.logoUrl ? (
                          <img 
                            src={site.logoUrl} 
                            alt={site.name} 
                            className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shrink-0" 
                            onError={(e) => { (e.target as any).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30 shrink-0">
                            {site.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate hover:text-white cursor-pointer" onClick={() => navigate(`/admin/websites/${site.id}/edit`)}>
                            {site.name}
                          </p>
                          <a 
                            href={site.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 hover:text-indigo-400 truncate flex items-center gap-1"
                          >
                            {site.url.replace(/^https?:\/\//, '')}
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${statusColors}`}>
                          {site.status}
                        </span>
                        <button
                          onClick={() => navigate(`/admin/websites/${site.id}/edit`)}
                          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Recent Activity
              </h4>
              <button
                onClick={() => navigate('/admin/activity')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                Full log
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-800/60 flex-1">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recent activity recorded yet.</p>
              ) : (
                recentActivity.map(log => (
                  <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{log.action}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {log.entityType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{log.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
