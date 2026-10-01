import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Copy, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RefreshCw,
  Globe,
  Tag
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../common/Modal';
import { 
  fetchWebsites, 
  fetchCategories, 
  deleteWebsite, 
  duplicateWebsite, 
  updateWebsite 
} from '../../lib/firestoreService';
import { Website, Category } from '../../types';

export const WebsitesList: React.FC = () => {
  const { navigate, currentPath } = useNavigation();
  const { showSuccess, showError } = useToast();

  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(() => {
    // initialize from URL query if present (e.g. ?status=draft)
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('status') || 'all';
  });
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'az' | 'za' | 'clicks'>('newest');

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Website | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action in progress state
  const [actionId, setActionId] = useState<string | null>(null);

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
      showError('Failed to load websites from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update status filter if query string changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const s = urlParams.get('status');
    if (s && ['draft', 'active', 'disabled'].includes(s)) {
      setStatusFilter(s);
    }
  }, [currentPath]);

  // Actions
  const handleToggleStatus = async (website: Website) => {
    setActionId(website.id);
    const newStatus = website.status === 'active' ? 'disabled' : 'active';
    try {
      await updateWebsite(website.id, { status: newStatus });
      setWebsites(prev => prev.map(w => w.id === website.id ? { ...w, status: newStatus } : w));
      showSuccess(`Website ${newStatus === 'active' ? 'activated' : 'disabled'} successfully.`);
    } catch (err) {
      showError('Failed to update status.');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleFeatured = async (website: Website) => {
    setActionId(website.id);
    const nextFeatured = !website.featured;
    try {
      await updateWebsite(website.id, { 
        featured: nextFeatured,
        featuredOrder: nextFeatured ? 1 : 0
      });
      setWebsites(prev => prev.map(w => w.id === website.id ? { ...w, featured: nextFeatured } : w));
      showSuccess(nextFeatured ? 'Website featured.' : 'Website removed from featured.');
    } catch (err) {
      showError('Failed to update featured state.');
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (website: Website) => {
    setActionId(website.id);
    try {
      const newId = await duplicateWebsite(website);
      showSuccess(`Website duplicated as "${website.name} (Copy)".`);
      // Refresh list to include new duplicate
      await loadData();
      // Optionally open edit
      navigate(`/admin/websites/${newId}/edit`);
    } catch (err) {
      showError('Failed to duplicate website.');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWebsite(deleteTarget.id, deleteTarget.name);
      setWebsites(prev => prev.filter(w => w.id !== deleteTarget.id));
      showSuccess('Website deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      showError('Unable to delete this website. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtering & Sorting logic
  const categoryMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const filteredWebsites = websites.filter(site => {
    // Search filter: name, URL, description, category, tags
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const catName = (categoryMap[site.categoryId] || '').toLowerCase();
      const inName = site.name.toLowerCase().includes(term);
      const inUrl = site.url.toLowerCase().includes(term);
      const inDesc = (site.description || '').toLowerCase().includes(term);
      const inCat = catName.includes(term);
      const inTags = (site.tags || []).some(t => t.toLowerCase().includes(term));
      if (!inName && !inUrl && !inDesc && !inCat && !inTags) return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && site.categoryId !== categoryFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && site.status !== statusFilter) {
      return false;
    }

    // Featured filter
    if (featuredFilter === 'featured' && !site.featured) return false;
    if (featuredFilter === 'not-featured' && site.featured) return false;

    return true;
  }).sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortOption === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortOption === 'az') {
      return a.name.localeCompare(b.name);
    }
    if (sortOption === 'za') {
      return b.name.localeCompare(a.name);
    }
    if (sortOption === 'clicks') {
      return (b.clickCount || 0) - (a.clickCount || 0);
    }
    return 0;
  });

  return (
    <AdminLayout
      title="Websites Management"
      subtitle={`Manage all directory listings (${websites.length} total, ${filteredWebsites.length} matching criteria).`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh List"
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
      <div className="space-y-4">
        {/* Top Controls: Search & Filters */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search websites by name, URL, description, category, #tags..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48 shrink-0">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-36 shrink-0">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Featured Filter */}
            <div className="w-full md:w-36 shrink-0">
              <select
                value={featuredFilter}
                onChange={e => setFeaturedFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Featured</option>
                <option value="featured">Featured Only</option>
                <option value="not-featured">Not Featured</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="w-full md:w-40 shrink-0">
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="az">Sort: A-Z</option>
                <option value="za">Sort: Z-A</option>
                <option value="clicks">Sort: Most Clicked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Website List Content: Desktop Table & Mobile Cards */}
        {loading ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-medium">Loading websites from Firestore...</p>
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">No websites found</h4>
            <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Your directory is currently empty. Get started by adding your first listing.'}
            </p>
            <button
              onClick={() => navigate('/admin/websites/new')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Website
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden lg:block bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Featured</th>
                    <th className="py-3 px-4 text-center">Clicks</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredWebsites.map(site => {
                    const statusBadge = {
                      active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                      draft: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                      disabled: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }[site.status];

                    const isActing = actionId === site.id;

                    return (
                      <tr key={site.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Logo, Name, URL */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
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
                            <div className="min-w-0 max-w-[200px] xl:max-w-xs">
                              <p className="font-semibold text-slate-200 truncate hover:text-indigo-400 cursor-pointer" onClick={() => navigate(`/admin/websites/${site.id}/edit`)}>
                                {site.name}
                              </p>
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-slate-400 hover:text-indigo-400 truncate flex items-center gap-1 mt-0.5"
                              >
                                <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[11px] font-medium">
                            {categoryMap[site.categoryId] || 'Uncategorized'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${statusBadge}`}>
                            {site.status}
                          </span>
                        </td>

                        {/* Featured */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleFeatured(site)}
                            disabled={isActing}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              site.featured
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
                            }`}
                            title={site.featured ? 'Unfeature website' : 'Feature website'}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Clicks */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                          {site.clickCount || 0}
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          <div>Added: {site.createdAt ? new Date(site.createdAt).toLocaleDateString() : '-'}</div>
                          <div className="text-slate-400">Updated: {site.updatedAt ? new Date(site.updatedAt).toLocaleDateString() : '-'}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* View external */}
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                              title="Visit live site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Edit */}
                            <button
                              onClick={() => navigate(`/admin/websites/${site.id}/edit`)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded transition-colors"
                              title="Edit Website"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicate(site)}
                              disabled={isActing}
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded transition-colors"
                              title="Duplicate Website"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Enable/Disable */}
                            <button
                              onClick={() => handleToggleStatus(site)}
                              disabled={isActing}
                              className={`p-1.5 rounded transition-colors ${
                                site.status === 'active'
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                              }`}
                              title={site.status === 'active' ? 'Disable Website' : 'Activate Website'}
                            >
                              {site.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(site)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors"
                              title="Delete Website"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (displayed on < lg screens) */}
            <div className="lg:hidden space-y-3">
              {filteredWebsites.map(site => {
                const statusBadge = {
                  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  draft: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  disabled: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }[site.status];

                const isActing = actionId === site.id;

                return (
                  <div key={site.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {site.logoUrl ? (
                          <img
                            src={site.logoUrl}
                            alt={site.name}
                            className="w-10 h-10 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shrink-0"
                            onError={(e) => { (e.target as any).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-sm flex items-center justify-center border border-indigo-500/30 shrink-0">
                            {site.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-100 text-sm truncate" onClick={() => navigate(`/admin/websites/${site.id}/edit`)}>
                            {site.name}
                          </h4>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 truncate flex items-center gap-1"
                          >
                            <span className="truncate">{site.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider shrink-0 ${statusBadge}`}>
                        {site.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {site.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {categoryMap[site.categoryId] || 'Uncategorized'}
                      </span>
                      <span>Clicks: <b className="text-slate-200">{site.clickCount || 0}</b></span>
                      {site.featured && (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Sparkles className="w-3 h-3" /> Featured (#{site.featuredOrder || 1})
                        </span>
                      )}
                    </div>

                    {/* Mobile Action Buttons Bar */}
                    <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => navigate(`/admin/websites/${site.id}/edit`)}
                        className="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded flex flex-col items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggleFeatured(site)}
                        disabled={isActing}
                        className={`p-2 text-xs rounded flex flex-col items-center gap-1 ${
                          site.featured ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{site.featured ? 'Unstar' : 'Feature'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(site)}
                        disabled={isActing}
                        className={`p-2 text-xs rounded flex flex-col items-center gap-1 ${
                          site.status === 'active' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {site.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{site.status === 'active' ? 'Disable' : 'Enable'}</span>
                      </button>

                      <button
                        onClick={() => handleDuplicate(site)}
                        disabled={isActing}
                        className="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 rounded flex flex-col items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copy</span>
                      </button>

                      <button
                        onClick={() => setDeleteTarget(site)}
                        className="p-2 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded flex flex-col items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete this website?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will permanently remove the Firestore document.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
      />
    </AdminLayout>
  );
};
