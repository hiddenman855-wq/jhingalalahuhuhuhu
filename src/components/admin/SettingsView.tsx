import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Globe, 
  Search, 
  UserCheck, 
  Download, 
  Lock, 
  LogOut, 
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { 
  fetchSettings, 
  saveSettings, 
  fetchWebsites, 
  fetchCategories 
} from '../../lib/firestoreService';
import { DirectorySettings } from '../../types';

export const SettingsView: React.FC = () => {
  const { user, logout, updateUserPassword } = useAuth();
  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToast();

  const [settings, setSettings] = useState<DirectorySettings>({
    directoryName: 'IndexHub',
    directoryDescription: 'Curated directory of high quality websites, tools, and digital resources.',
    logo: '',
    contactEmail: 'contact@indexhub.directory',
    seoTitle: 'IndexHub - Curated Directory & CMS',
    seoDescription: 'Find and curate top verified apps, tools, and digital resources.',
    socialImage: '',
    updatedAt: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password Change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await fetchSettings();
        setSettings(s);
      } catch (err) {
        showError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSaveGeneralAndSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      showSuccess('Changes saved successfully.');
    } catch (err) {
      showError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    setPasswordUpdating(true);
    try {
      await updateUserPassword(newPassword);
      showSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError(err.message || 'Failed to update password. You may need to re-login.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportWebsitesJSON = async () => {
    try {
      const websites = await fetchWebsites();
      downloadFile(JSON.stringify(websites, null, 2), `indexhub-websites-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      showSuccess('Websites exported as JSON.');
    } catch {
      showError('Export failed.');
    }
  };

  const exportWebsitesCSV = async () => {
    try {
      const websites = await fetchWebsites();
      const headers = ['id', 'name', 'slug', 'url', 'categoryId', 'status', 'featured', 'clickCount', 'createdAt'];
      const rows = websites.map(w => [
        `"${w.id}"`,
        `"${(w.name || '').replace(/"/g, '""')}"`,
        `"${w.slug || ''}"`,
        `"${w.url || ''}"`,
        `"${w.categoryId || ''}"`,
        `"${w.status || ''}"`,
        `"${w.featured ? 'true' : 'false'}"`,
        w.clickCount || 0,
        `"${w.createdAt || ''}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csvContent, `indexhub-websites-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      showSuccess('Websites exported as CSV.');
    } catch {
      showError('Export failed.');
    }
  };

  const exportCategoriesJSON = async () => {
    try {
      const categories = await fetchCategories();
      downloadFile(JSON.stringify(categories, null, 2), `indexhub-categories-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      showSuccess('Categories exported as JSON.');
    } catch {
      showError('Export failed.');
    }
  };

  const exportCategoriesCSV = async () => {
    try {
      const categories = await fetchCategories();
      const headers = ['id', 'name', 'slug', 'description', 'displayOrder', 'active'];
      const rows = categories.map(c => [
        `"${c.id}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.slug || ''}"`,
        `"${(c.description || '').replace(/"/g, '""')}"`,
        c.displayOrder || 1,
        `"${c.active ? 'true' : 'false'}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csvContent, `indexhub-categories-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      showSuccess('Categories exported as CSV.');
    } catch {
      showError('Export failed.');
    }
  };

  const exportCompleteDirectoryJSON = async () => {
    try {
      const [websites, categories, currentSettings] = await Promise.all([
        fetchWebsites(),
        fetchCategories(),
        fetchSettings()
      ]);
      const fullBackup = {
        exportedAt: new Date().toISOString(),
        settings: currentSettings,
        categories,
        websites
      };
      downloadFile(JSON.stringify(fullBackup, null, 2), `indexhub-full-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      showSuccess('Complete directory backup downloaded.');
    } catch {
      showError('Backup generation failed.');
    }
  };

  return (
    <AdminLayout
      title="Directory Settings & Backup"
      subtitle="Manage global directory identity, SEO metadata, admin access, and data exports."
    >
      <div className="space-y-6 max-w-4xl">
        {/* GENERAL & SEO FORM */}
        <form onSubmit={handleSaveGeneralAndSeo} className="space-y-6">
          {/* General Section */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              General Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Directory Name
                </label>
                <input
                  type="text"
                  value={settings.directoryName}
                  onChange={e => setSettings({ ...settings, directoryName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Directory Description
              </label>
              <textarea
                rows={2}
                value={settings.directoryDescription}
                onChange={e => setSettings({ ...settings, directoryDescription: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Logo URL (Optional)
              </label>
              <input
                type="url"
                value={settings.logo}
                onChange={e => setSettings({ ...settings, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* SEO Section */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              SEO & Social Sharing
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default SEO Title
              </label>
              <input
                type="text"
                value={settings.seoTitle}
                onChange={e => setSettings({ ...settings, seoTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default SEO Description
              </label>
              <textarea
                rows={2}
                value={settings.seoDescription}
                onChange={e => setSettings({ ...settings, seoDescription: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Social Share Image (OG Image)
              </label>
              <input
                type="url"
                value={settings.socialImage}
                onChange={e => setSettings({ ...settings, socialImage: e.target.value })}
                placeholder="https://example.com/og-image.jpg"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* ADMIN ACCOUNT SECTION */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            Admin Account & Security
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Signed in Administrator</span>
              <span className="font-semibold text-slate-200">{user?.email || 'admin@example.com'}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/admin/login'); }}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Change Password
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordUpdating || !newPassword}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {passwordUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* DATA / BACKUP SECTION */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            Data Backup & Export
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Export directory content into standard JSON or CSV files for archival, migrations, or spreadsheet reporting. Credentials and sensitive tokens are never exported.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Export Websites */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 block">Websites</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportWebsitesJSON}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={exportWebsitesCSV}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  CSV
                </button>
              </div>
            </div>

            {/* Export Categories */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 block">Categories</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportCategoriesJSON}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={exportCategoriesCSV}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  CSV
                </button>
              </div>
            </div>

            {/* Full Directory Snapshot */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 block">Complete Snapshot</span>
              <button
                type="button"
                onClick={exportCompleteDirectoryJSON}
                className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Full Backup (JSON)
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
