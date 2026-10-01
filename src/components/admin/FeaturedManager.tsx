import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Star, 
  StarOff, 
  ExternalLink, 
  Search, 
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { 
  fetchWebsites, 
  fetchCategories, 
  updateWebsite 
} from '../../lib/firestoreService';
import { Website, Category } from '../../types';

export const FeaturedManager: React.FC = () => {
  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToast();

  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchAdd, setSearchAdd] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      showError('Failed to load websites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Featured websites sorted by featuredOrder
  const featuredWebsites = websites
    .filter(w => w.featured)
    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));

  // Non-featured active websites for search/add
  const unfeaturedWebsites = websites
    .filter(w => !w.featured && w.status === 'active')
    .filter(w => {
      if (!searchAdd.trim()) return true;
      const term = searchAdd.toLowerCase();
      return w.name.toLowerCase().includes(term) || w.url.toLowerCase().includes(term);
    })
    .slice(0, 10);

  const handleToggleFeatured = async (website: Website, makeFeatured: boolean) => {
    setUpdatingId(website.id);
    try {
      const newOrder = makeFeatured ? (featuredWebsites.length + 1) : 0;
      await updateWebsite(website.id, {
        featured: makeFeatured,
        featuredOrder: newOrder
      });
      setWebsites(prev => prev.map(w => w.id === website.id ? { ...w, featured: makeFeatured, featuredOrder: newOrder } : w));
      showSuccess(makeFeatured ? `"${website.name}" featured.` : `"${website.name}" removed from featured.`);
    } catch (err) {
      showError('Failed to update featured state.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOrderChange = async (website: Website, newOrder: number) => {
    if (newOrder < 1) newOrder = 1;
    setUpdatingId(website.id);
    try {
      await updateWebsite(website.id, { featuredOrder: newOrder });
      setWebsites(prev => prev.map(w => w.id === website.id ? { ...w, featuredOrder: newOrder } : w));
      showSuccess('Featured order updated.');
    } catch (err) {
      showError('Failed to change order.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= featuredWebsites.length) return;

    const current = featuredWebsites[index];
    const target = featuredWebsites[targetIndex];

    const currentOrder = current.featuredOrder || index + 1;
    const targetOrder = target.featuredOrder || targetIndex + 1;

    setUpdatingId(current.id);
    try {
      await Promise.all([
        updateWebsite(current.id, { featuredOrder: targetOrder }),
        updateWebsite(target.id, { featuredOrder: currentOrder })
      ]);
      await loadData();
      showSuccess('Featured order reordered.');
    } catch (err) {
      showError('Failed to swap order.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout
      title="Featured Websites Management"
      subtitle="Curate the spotlight collection showcased prominently on the public homepage."
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Current Featured Websites List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Featured Spotlight ({featuredWebsites.length})
              </h3>
              <span className="text-xs text-slate-400">Order determines placement on public hero</span>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading featured listings...</p>
              </div>
            ) : featuredWebsites.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-200">No websites currently featured</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select websites from the right panel to feature them on the homepage.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {featuredWebsites.map((site, idx) => (
                  <div
                    key={site.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Move Order Buttons */}
                      <div className="flex flex-col items-center shrink-0">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0 || updatingId === site.id}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          #{site.featuredOrder || idx + 1}
                        </span>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === featuredWebsites.length - 1 || updatingId === site.id}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Logo & Info */}
                      {site.logoUrl ? (
                        <img
                          src={site.logoUrl}
                          alt={site.name}
                          className="w-9 h-9 rounded-lg object-contain bg-slate-900 p-1 border border-slate-700 shrink-0"
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30 shrink-0">
                          {site.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-100 truncate">{site.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="truncate max-w-[180px]">{site.url.replace(/^https?:\/\//, '')}</span>
                          <span>•</span>
                          <span className="text-indigo-400">{categoryMap[site.categoryId] || 'Category'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        value={site.featuredOrder || idx + 1}
                        onChange={(e) => handleOrderChange(site, parseInt(e.target.value) || 1)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center text-slate-200"
                        title="Direct order edit"
                      />
                      <button
                        onClick={() => handleToggleFeatured(site, false)}
                        disabled={updatingId === site.id}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
                        title="Remove from featured"
                      >
                        <StarOff className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Column: Quick Add to Featured */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-indigo-400" />
              Add Website to Featured
            </h3>

            {/* Search websites to feature */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search active websites..."
                value={searchAdd}
                onChange={e => setSearchAdd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto pr-1">
              {unfeaturedWebsites.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {searchAdd ? 'No unfeatured website matches search.' : 'All active websites are already featured.'}
                </p>
              ) : (
                unfeaturedWebsites.map(site => (
                  <div key={site.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-slate-200 truncate">{site.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{categoryMap[site.categoryId]}</p>
                    </div>
                    <button
                      onClick={() => handleToggleFeatured(site, true)}
                      disabled={updatingId === site.id}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Feature
                    </button>
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
