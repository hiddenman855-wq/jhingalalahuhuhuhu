import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Clock, 
  Tag as TagIcon, 
  X, 
  Plus, 
  ExternalLink, 
  Calendar,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Globe
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { 
  fetchCategories, 
  getWebsiteById, 
  createWebsite, 
  updateWebsite 
} from '../../lib/firestoreService';
import { Category, Website, WebsiteStatus } from '../../types';

interface WebsiteFormProps {
  isEdit?: boolean;
}

export const WebsiteForm: React.FC<WebsiteFormProps> = ({ isEdit = false }) => {
  const { params, navigate } = useNavigation();
  const { showSuccess, showError } = useToast();

  const websiteId = params.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<number>(0);
  const [status, setStatus] = useState<WebsiteStatus>('active');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>(new Date().toISOString());

  // Existing document metadata
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);

        if (cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }

        if (isEdit && websiteId) {
          const site = await getWebsiteById(websiteId);
          if (!site) {
            showError('Website listing not found.');
            navigate('/admin/websites');
            return;
          }
          setName(site.name || '');
          setUrl(site.url || '');
          setDescription(site.description || '');
          setLongDescription(site.longDescription || '');
          setCategoryId(site.categoryId || (cats[0]?.id ?? ''));
          setTags(site.tags || []);
          setLogoUrl(site.logoUrl || '');
          setFeatured(Boolean(site.featured));
          setFeaturedOrder(site.featuredOrder || 0);
          setStatus(site.status || 'active');
          setDisplayOrder(site.displayOrder || 1);
          setLastCheckedAt(site.lastCheckedAt || new Date().toISOString());
          setCreatedAt(site.createdAt || null);
          setUpdatedAt(site.updatedAt || null);
          setClickCount(site.clickCount || 0);
        }
      } catch (err) {
        showError('Failed to load form data.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isEdit, websiteId]);

  // URL Validator: allow only HTTP/HTTPS
  const validateUrl = (testUrl: string): boolean => {
    try {
      const parsed = new URL(testUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Website name is required';
    if (!url.trim()) {
      errs.url = 'Website URL is required';
    } else if (!validateUrl(url.trim())) {
      errs.url = 'URL must start with http:// or https:// (e.g. https://example.com)';
    }

    if (!description.trim()) errs.description = 'Short description is required';
    if (!categoryId) errs.categoryId = 'Category is required';
    if (logoUrl.trim() && !validateUrl(logoUrl.trim())) {
      errs.logoUrl = 'Logo URL must start with http:// or https://';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddTag = () => {
    let t = tagInput.trim();
    if (!t) return;
    if (!t.startsWith('#')) t = '#' + t;
    if (!tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (targetStatus?: WebsiteStatus) => {
    if (!validate()) {
      showError('Please correct the highlighted form errors.');
      return;
    }

    setSubmitting(true);
    const chosenStatus = targetStatus || status;

    const payload = {
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      url: url.trim(),
      description: description.trim(),
      longDescription: longDescription.trim(),
      categoryId,
      tags,
      logoUrl: logoUrl.trim(),
      featured,
      featuredOrder: Number(featuredOrder) || 0,
      status: chosenStatus,
      displayOrder: Number(displayOrder) || 1,
      lastCheckedAt: lastCheckedAt || new Date().toISOString(),
      clickCount: clickCount || 0
    };

    try {
      if (isEdit && websiteId) {
        await updateWebsite(websiteId, payload);
        showSuccess('Website updated successfully.');
        navigate('/admin/websites');
      } else {
        await createWebsite(payload);
        showSuccess('Website added successfully.');
        navigate('/admin/websites');
      }
    } catch (err) {
      showError(isEdit ? 'Unable to update website. Please try again.' : 'Unable to create website. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title={isEdit ? 'Edit Website' : 'Add Website'}>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Loading website details...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEdit ? `Edit Website: ${name || 'Listing'}` : 'Add New Website'}
      subtitle={isEdit ? 'Update information in the existing Firestore document.' : 'Create a new listing in the IndexHub directory.'}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/websites')}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6 max-w-4xl">
        {/* Main Details Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Basic Listing Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Website Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Website Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. GitHub"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 ${
                  errors.name ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Website URL <span className="text-rose-400">*</span> (HTTP/HTTPS only)
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 ${
                  errors.url ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.url && <p className="text-[11px] text-rose-400 mt-1">{errors.url}</p>}
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Short Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="One or two sentences describing what this website does..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={250}
              className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 ${
                errors.description ? 'border-rose-500' : 'border-slate-800'
              }`}
            />
            {errors.description && <p className="text-[11px] text-rose-400 mt-1">{errors.description}</p>}
          </div>

          {/* Long Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Long Description (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="In-depth details, key features, pricing model, and overview..."
              value={longDescription}
              onChange={e => setLongDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 ${
                  errors.categoryId ? 'border-rose-500' : 'border-slate-800'
                }`}
              >
                {categories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.active ? '(Disabled)' : ''}
                    </option>
                  ))
                )}
              </select>
              {errors.categoryId && <p className="text-[11px] text-rose-400 mt-1">{errors.categoryId}</p>}
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Logo / Favicon URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="w-9 h-9 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shrink-0"
                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. AI, OpenSource, FreeTools"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tag
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-indigo-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Visibility, Placement & Metadata Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Publication & Display Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as WebsiteStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="active">Active (Publicly Visible)</option>
                <option value="draft">Draft (Hidden Publicly)</option>
                <option value="disabled">Disabled (Hidden Publicly)</option>
              </select>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Featured Order */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Featured Order
              </label>
              <input
                type="number"
                min={0}
                value={featuredOrder}
                onChange={e => setFeaturedOrder(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Featured Toggle Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={featured}
                onChange={e => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Feature this website</span>
                <span className="text-[11px] text-slate-400">
                  Featured websites appear in the highlighted spotlight on the public homepage.
                </span>
              </div>
            </label>
          </div>

          {/* Last Checked At Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Link Integrity & Verification</span>
              <span className="text-slate-200 font-medium">
                Last checked: {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString() : 'Never'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastCheckedAt(new Date().toISOString())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-[11px] flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Mark Checked Now
            </button>
          </div>

          {/* Readonly info for Edit mode */}
          {isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <div>Created: {createdAt ? new Date(createdAt).toLocaleString() : '-'}</div>
              <div>Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}</div>
              <div>Total Clicks: <span className="text-slate-200 font-bold">{clickCount}</span></div>
            </div>
          )}
        </div>

        {/* Action Buttons: Save Draft, Publish, Cancel */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/websites')}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('active')}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Processing...' : isEdit ? 'Update Website' : 'Publish Website'}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};
