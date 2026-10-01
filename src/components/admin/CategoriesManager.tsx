import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  PlusCircle, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertTriangle,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useToast } from '../../context/ToastContext';
import { Modal, ConfirmDialog } from '../common/Modal';
import { 
  fetchCategories, 
  fetchWebsites, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  reassignCategoryWebsites
} from '../../lib/firestoreService';
import { Category, Website } from '../../types';

export const CategoriesManager: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Category Modal (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete & Reassignment state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [showSafeDeleteModal, setShowSafeDeleteModal] = useState(false);
  const [targetReassignCatId, setTargetReassignCatId] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, webs] = await Promise.all([
        fetchCategories(),
        fetchWebsites()
      ]);
      setCategories(cats);
      setWebsites(webs);
    } catch (err) {
      showError('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Folder');
    setDisplayOrder((categories.length > 0 ? Math.max(...categories.map(c => c.displayOrder || 0)) : 0) + 1);
    setActive(true);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Folder');
    setDisplayOrder(cat.displayOrder || 1);
    setActive(Boolean(cat.active));
    setErrors({});
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Category name is required';
    if (!slug.trim()) errs.slug = 'Slug is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCategory = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        icon: icon.trim() || 'Folder',
        displayOrder: Number(displayOrder) || 1,
        active
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        showSuccess('Category updated successfully.');
      } else {
        await createCategory(payload);
        showSuccess('Category created successfully.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      showError('Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      const nextActive = !cat.active;
      await updateCategory(cat.id, { active: nextActive });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: nextActive } : c));
      showSuccess(`Category ${nextActive ? 'enabled' : 'disabled'} successfully.`);
    } catch (err) {
      showError('Failed to toggle category status.');
    }
  };

  const handleMoveOrder = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const currentIndex = sorted.findIndex(c => c.id === cat.id);
    if (currentIndex < 0) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const otherCat = sorted[swapIndex];
    const currentOrder = cat.displayOrder || 0;
    const otherOrder = otherCat.displayOrder || 0;

    try {
      // Swap displayOrder
      await Promise.all([
        updateCategory(cat.id, { displayOrder: otherOrder }),
        updateCategory(otherCat.id, { displayOrder: currentOrder })
      ]);
      await loadData();
      showSuccess('Category order updated.');
    } catch (err) {
      showError('Failed to reorder categories.');
    }
  };

  // Safe Deletion Flow (Part 15)
  const initiateDelete = (cat: Category) => {
    const count = websites.filter(w => w.categoryId === cat.id).length;
    setDeleteTarget(cat);
    if (count > 0) {
      // Websites use this category! Open safe options modal
      const otherCategories = categories.filter(c => c.id !== cat.id);
      setTargetReassignCatId(otherCategories[0]?.id || '');
      setShowSafeDeleteModal(true);
    } else {
      // 0 websites use it, regular confirm dialog
      setShowSafeDeleteModal(false);
    }
  };

  const handleConfirmDirectDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id, deleteTarget.name);
      showSuccess('Category deleted successfully.');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showError('Unable to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!deleteTarget || !targetReassignCatId) return;
    setDeleting(true);
    try {
      await reassignCategoryWebsites(deleteTarget.id, targetReassignCatId);
      await deleteCategory(deleteTarget.id, deleteTarget.name);
      showSuccess('Websites moved and category deleted successfully.');
      setShowSafeDeleteModal(false);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showError('Failed to reassign and delete category.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDisableInstead = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await updateCategory(deleteTarget.id, { active: false });
      showSuccess('Category disabled instead of deleted.');
      setShowSafeDeleteModal(false);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showError('Failed to disable category.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term);
  });

  return (
    <AdminLayout
      title="Category Management"
      subtitle="Create, edit, reorder, and safely delete directory classifications."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-900/30 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories by name or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300">Loading categories from Firestore...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <FolderTree className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">No categories found</h4>
            <p className="text-xs text-slate-400 mb-4">
              {searchTerm ? 'No categories matched your search.' : 'Add your first category to start organizing listings.'}
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Order</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4 text-center">Websites</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredCategories.map((cat, idx) => {
                    const siteCount = websites.filter(w => w.categoryId === cat.id).length;

                    return (
                      <tr key={cat.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Display Order & Reorder Controls */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-300 font-semibold w-5">{cat.displayOrder}</span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleMoveOrder(cat, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(cat, 'down')}
                                disabled={idx === filteredCategories.length - 1}
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name & Description */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-slate-200 text-sm">{cat.name}</p>
                            {cat.description && (
                              <p className="text-[11px] text-slate-400 max-w-sm truncate mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          /{cat.slug}
                        </td>

                        {/* Website Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            siteCount > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {siteCount}
                          </span>
                        </td>

                        {/* Status (Active / Disabled) */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                            cat.active 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {cat.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(cat)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded transition-colors"
                              title="Edit Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Enable / Disable */}
                            <button
                              onClick={() => handleToggleActive(cat)}
                              className={`p-1.5 rounded transition-colors ${
                                cat.active
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                              }`}
                              title={cat.active ? 'Disable Category' : 'Enable Category'}
                            >
                              {cat.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => initiateDelete(cat)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors"
                              title="Delete Category"
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

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {filteredCategories.map((cat, idx) => {
                const siteCount = websites.filter(w => w.categoryId === cat.id).length;

                return (
                  <div key={cat.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            #{cat.displayOrder}
                          </span>
                          <h4 className="font-semibold text-slate-100 text-sm">{cat.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">/{cat.slug}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                        cat.active 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {cat.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cat.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">
                        Contains <b className="text-indigo-400">{siteCount}</b> websites
                      </span>

                      {/* Mobile Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveOrder(cat, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 bg-slate-800 text-slate-300 rounded disabled:opacity-20"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(cat, 'down')}
                          disabled={idx === filteredCategories.length - 1}
                          className="p-1.5 bg-slate-800 text-slate-300 rounded disabled:opacity-20"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 bg-slate-800 text-indigo-300 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className="p-1.5 bg-slate-800 text-amber-300 rounded"
                        >
                          {cat.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => initiateDelete(cat)}
                          className="p-1.5 bg-rose-500/10 text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Category Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. AI Tools"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 ${
                errors.name ? 'border-rose-500' : 'border-slate-800'
              }`}
            />
            {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              URL Slug <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ai-tools"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono ${
                errors.slug ? 'border-rose-500' : 'border-slate-800'
              }`}
            />
            {errors.slug && <p className="text-[11px] text-rose-400 mt-1">{errors.slug}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe what kind of websites belong in this category..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                value={displayOrder}
                onChange={e => setDisplayOrder(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Icon Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bot, Code, Zap"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
              />
              <span className="text-xs text-slate-200">Active (Visible in directory navigation)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Delete Modal (When 0 websites use the category) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget) && !showSafeDeleteModal}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDirectDelete}
        title="Delete this category?"
        message={`Are you sure you want to permanently delete category "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleting}
      />

      {/* Safe Deletion Modal (Part 15: When websites use the category) */}
      <Modal
        isOpen={showSafeDeleteModal && Boolean(deleteTarget)}
        onClose={() => { setShowSafeDeleteModal(false); setDeleteTarget(null); }}
        title="Category Contains Websites"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-100">
                This category contains {websites.filter(w => w.categoryId === deleteTarget?.id).length} websites.
              </p>
              <p className="text-amber-300/80 leading-relaxed">
                To prevent broken listings, websites cannot point to a deleted category. Choose a safe action below:
              </p>
            </div>
          </div>

          {/* Option 1: Reassign to another category and delete */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-200 block">
              Option 1: Move websites to another category & delete
            </span>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <select
                value={targetReassignCatId}
                onChange={e => setTargetReassignCatId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {categories.filter(c => c.id !== deleteTarget?.id).map(c => (
                  <option key={c.id} value={c.id}>
                    Move to: {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleReassignAndDelete}
                disabled={deleting || !targetReassignCatId}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Move & Delete
              </button>
            </div>
          </div>

          {/* Option 2: Disable category instead */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Option 2: Disable Category
              </span>
              <span className="text-[11px] text-slate-400">
                Hides category from public browsing while preserving all existing websites intact.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDisableInstead}
              disabled={deleting}
              className="px-3.5 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-50"
            >
              Disable Category
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setShowSafeDeleteModal(false); setDeleteTarget(null); }}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
