import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Sparkles, 
  ExternalLink, 
  Tag, 
  ShieldCheck, 
  FolderTree, 
  Clock, 
  ChevronRight, 
  CheckCircle,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { 
  fetchPublicWebsites, 
  fetchPublicCategories, 
  fetchSettings, 
  incrementWebsiteClick 
} from '../../lib/firestoreService';
import { Website, Category, DirectorySettings } from '../../types';
import { Modal } from '../common/Modal';

export const PublicDirectory: React.FC = () => {
  const { navigate } = useNavigation();

  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<DirectorySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Detail Modal
  const [viewingWebsite, setViewingWebsite] = useState<Website | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [w, c, s] = await Promise.all([
          fetchPublicWebsites(),
          fetchPublicCategories(),
          fetchSettings()
        ]);
        setWebsites(w);
        setCategories(c);
        setSettings(s);
      } catch (err) {
        console.error('Error fetching public directory data:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleVisit = async (website: Website, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Safely increment clickCount in Firestore
    incrementWebsiteClick(website.id);
    // Optimistically update local click count
    setWebsites(prev => prev.map(w => w.id === website.id ? { ...w, clickCount: (w.clickCount || 0) + 1 } : w));
    // Open target website
    window.open(website.url, '_blank', 'noopener,noreferrer');
  };

  const categoryMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Featured websites sorted by featuredOrder
  const featuredWebsites = websites
    .filter(w => w.featured)
    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));

  // Filtered listings
  const filteredListings = websites.filter(site => {
    if (selectedCategory !== 'all' && site.categoryId !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const catName = (categoryMap[site.categoryId] || '').toLowerCase();
      const inName = site.name.toLowerCase().includes(q);
      const inDesc = site.description.toLowerCase().includes(q);
      const inCat = catName.includes(q);
      const inTags = (site.tags || []).some(t => t.toLowerCase().includes(q));
      if (!inName && !inDesc && !inCat && !inTags) return false;
    }
    return true;
  }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20 text-base">
              IH
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-100 text-lg leading-tight">
                {settings?.directoryName || 'IndexHub'}
              </h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">
                Curated Web Directory
              </p>
            </div>
          </div>

          {/* Right Header Navigation - Only Admin CMS */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-900/30 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin CMS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Curated, Verified & Categorized Resources
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Discover the Best Tools & Websites on the Internet
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {settings?.directoryDescription || 'Find handpicked software, AI utilities, developer tools, and creative libraries carefully cataloged for everyday professionals.'}
          </p>

          {/* Search bar in Hero */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by tool name, tags (#AI, #Design), or keywords..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-400 shadow-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-1 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Featured Spotlight (Only if websites are featured) */}
        {!searchQuery && selectedCategory === 'all' && featuredWebsites.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Featured Spotlight
              </h3>
              <span className="text-xs text-slate-400">Hand-curated editor's picks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredWebsites.map(site => (
                <div
                  key={site.id}
                  onClick={() => setViewingWebsite(site)}
                  className="bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
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
                        <h4 className="font-semibold text-slate-100 text-sm truncate group-hover:text-amber-300 transition-colors">
                          {site.name}
                        </h4>
                      </div>
                      <span className="p-1 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                        Featured
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {site.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-indigo-400 font-medium truncate max-w-[120px]">
                      {categoryMap[site.categoryId] || 'Curated'}
                    </span>
                    <button
                      onClick={(e) => handleVisit(site, e)}
                      className="px-2.5 py-1 rounded-md bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories Bar & Grid Section */}
        <section className="space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/30'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              All Tools ({websites.length})
            </button>

            {categories.map(cat => {
              const count = websites.filter(w => w.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/30'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Directory Listings Grid */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading directory listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200">No websites match your filter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try selecting another category or clearing your search term.
              </p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredListings.map(site => (
                <div
                  key={site.id}
                  onClick={() => setViewingWebsite(site)}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header: Logo, Name, Category */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {site.logoUrl ? (
                          <img
                            src={site.logoUrl}
                            alt={site.name}
                            className="w-10 h-10 rounded-xl object-contain bg-slate-950 p-1.5 border border-slate-800 shrink-0"
                            onError={(e) => { (e.target as any).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold text-sm flex items-center justify-center border border-indigo-500/30 shrink-0">
                            {site.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-100 text-base group-hover:text-indigo-400 transition-colors truncate">
                            {site.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {categoryMap[site.categoryId] || 'Curated'}
                          </span>
                        </div>
                      </div>

                      {site.featured && (
                        <span className="p-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {site.description}
                    </p>

                    {/* Tags */}
                    {site.tags && site.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {site.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-medium text-slate-400 bg-slate-950 border border-slate-800/80 px-2 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                        {site.tags.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{site.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer: Clicks & Visit Website Button */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <MousePointerClick className="w-3 h-3 text-slate-400" />
                      {site.clickCount || 0} visits
                    </span>

                    <button
                      onClick={(e) => handleVisit(site, e)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-900/30 transition-colors"
                    >
                      <span>Visit Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">{settings?.directoryName || 'IndexHub'}</span>
            <span>•</span>
            <span>Curated Directory & Management System</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Website Details Modal */}
      {viewingWebsite && (
        <Modal
          isOpen={Boolean(viewingWebsite)}
          onClose={() => setViewingWebsite(null)}
          title={viewingWebsite.name}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              {viewingWebsite.logoUrl ? (
                <img
                  src={viewingWebsite.logoUrl}
                  alt={viewingWebsite.name}
                  className="w-12 h-12 rounded-xl object-contain bg-slate-900 p-1.5 border border-slate-800 shrink-0"
                  onError={(e) => { (e.target as any).style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold text-base flex items-center justify-center border border-indigo-500/30 shrink-0">
                  {viewingWebsite.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-bold text-slate-100 text-base">{viewingWebsite.name}</h4>
                <a
                  href={viewingWebsite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-mono mt-0.5"
                >
                  {viewingWebsite.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Description</span>
              <p className="text-sm text-slate-200 leading-relaxed font-normal">
                {viewingWebsite.longDescription || viewingWebsite.description}
              </p>
            </div>

            {viewingWebsite.tags && viewingWebsite.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tagged Categories</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingWebsite.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Category: <b className="text-slate-200">{categoryMap[viewingWebsite.categoryId]}</b></span>
              <span>Visits: <b className="text-slate-200">{viewingWebsite.clickCount || 0}</b></span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingWebsite(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleVisit(viewingWebsite)}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span>Visit {viewingWebsite.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
