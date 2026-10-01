import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MousePointerClick, 
  TrendingUp, 
  ExternalLink, 
  FolderTree, 
  Globe, 
  RefreshCw,
  Award
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { fetchWebsites, fetchCategories } from '../../lib/firestoreService';
import { Website, Category } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        fetchWebsites(),
        fetchCategories()
      ]);
      setWebsites(w);
      setCategories(c);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalClicks = websites.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
  const activeWebsites = websites.filter(w => w.status === 'active');
  const avgClicksPerSite = activeWebsites.length > 0 
    ? (totalClicks / activeWebsites.length).toFixed(1) 
    : '0';

  const categoryMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Top clicked websites
  const topWebsites = [...websites]
    .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
    .slice(0, 10);

  // Category clicks breakdown
  const categoryClicks: Record<string, { count: number; clicks: number }> = {};
  websites.forEach(w => {
    const catName = categoryMap[w.categoryId] || 'Uncategorized';
    if (!categoryClicks[catName]) {
      categoryClicks[catName] = { count: 0, clicks: 0 };
    }
    categoryClicks[catName].count += 1;
    categoryClicks[catName].clicks += (w.clickCount || 0);
  });

  const popularCategories = Object.entries(categoryClicks)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.clicks - a.clicks);

  return (
    <AdminLayout
      title="Directory Analytics"
      subtitle="Real-time traffic and outbound engagement metrics based on Firestore data."
      actions={
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Outbound Clicks</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{totalClicks}</h3>
              <p className="text-[11px] text-emerald-400 mt-0.5">Real visitor visits recorded</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <MousePointerClick className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Active Listings</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{activeWebsites.length}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Of {websites.length} total listings</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Globe className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Avg Clicks / Active Site</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{avgClicksPerSite}</h3>
              <p className="text-[11px] text-indigo-400 mt-0.5">Average engagement depth</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2 Column breakdown: Top Websites & Popular Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Clicked Websites */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Award className="w-4 h-4 text-amber-400" />
              Most Clicked Websites
            </h4>

            {topWebsites.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No website clicks recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topWebsites.map((site, index) => {
                  const percent = totalClicks > 0 ? ((site.clickCount || 0) / totalClicks) * 100 : 0;

                  return (
                    <div key={site.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            index === 0 ? 'bg-amber-400 text-slate-950' :
                            index === 1 ? 'bg-slate-300 text-slate-950' :
                            index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-200 truncate">{site.name}</span>
                          <span className="text-[10px] text-slate-400 truncate">({categoryMap[site.categoryId] || 'Category'})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 font-mono text-indigo-300 font-semibold">
                          <span>{site.clickCount || 0}</span>
                          <span className="text-[10px] text-slate-400">clicks</span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular Categories */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <FolderTree className="w-4 h-4 text-teal-400" />
              Category Traffic Distribution
            </h4>

            {popularCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No categories recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {popularCategories.map((cat) => {
                  const percent = totalClicks > 0 ? (cat.clicks / totalClicks) * 100 : 0;

                  return (
                    <div key={cat.name} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-200">{cat.name}</span>
                          <span className="text-[11px] text-slate-400 ml-2">({cat.count} listings)</span>
                        </div>
                        <div className="font-mono text-teal-300 font-medium">
                          {cat.clicks} clicks ({percent.toFixed(0)}%)
                        </div>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
