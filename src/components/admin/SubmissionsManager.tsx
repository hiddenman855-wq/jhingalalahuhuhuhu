import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Check, 
  X, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Folder
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../common/Modal';
import { 
  fetchSubmissions, 
  fetchCategories, 
  updateSubmissionStatus, 
  deleteSubmission,
  createWebsite
} from '../../lib/firestoreService';
import { Submission, Category } from '../../types';

export const SubmissionsManager: React.FC = () => {
  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, cats] = await Promise.all([
        fetchSubmissions(),
        fetchCategories()
      ]);
      setSubmissions(subs);
      setCategories(cats);
    } catch (err) {
      showError('Failed to load submissions.');
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

  const handleApprove = async (sub: Submission) => {
    setActionId(sub.id);
    try {
      // 1. Create directory website
      await createWebsite({
        name: sub.name,
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        url: sub.url,
        description: sub.description,
        categoryId: sub.categoryId || categories[0]?.id || '',
        tags: ['#CommunitySubmission'],
        featured: false,
        featuredOrder: 0,
        status: 'active',
        displayOrder: 99,
        clickCount: 0,
        lastCheckedAt: new Date().toISOString()
      });

      // 2. Mark submission as approved
      await updateSubmissionStatus(sub.id, 'approved');
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'approved' } : s));
      showSuccess(`Approved "${sub.name}" and added to active websites.`);
    } catch (err) {
      showError('Failed to approve submission.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (sub: Submission) => {
    setActionId(sub.id);
    try {
      await updateSubmissionStatus(sub.id, 'rejected');
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'rejected' } : s));
      showSuccess(`Marked "${sub.name}" as rejected.`);
    } catch (err) {
      showError('Failed to reject submission.');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSubmission(deleteTarget.id);
      setSubmissions(prev => prev.filter(s => s.id !== deleteTarget.id));
      showSuccess('Submission deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showError('Failed to delete submission.');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  return (
    <AdminLayout
      title="User Submissions"
      subtitle="Review community suggested websites for inclusion in the directory."
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
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab} ({tab === 'all' ? submissions.length : submissions.filter(s => s.status === tab).length})
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300">Loading submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">No submissions found</h4>
            <p className="text-xs text-slate-400">
              {statusFilter === 'all' 
                ? 'No community suggestions have been submitted yet.' 
                : `No submissions with status "${statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map(sub => {
              const statusBadge = {
                pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                rejected: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }[sub.status];

              const isActing = actionId === sub.id;

              return (
                <div key={sub.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-semibold text-slate-100 text-sm">{sub.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${statusBadge}`}>
                        {sub.status}
                      </span>
                    </div>

                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                    >
                      {sub.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {sub.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3 text-slate-400" />
                        {categoryMap[sub.categoryId] || 'General'}
                      </span>
                      <span>•</span>
                      <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(sub)}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => handleReject(sub)}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setDeleteTarget(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Delete submission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete submission?"
        message={`Are you sure you want to delete the submission for "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </AdminLayout>
  );
};
