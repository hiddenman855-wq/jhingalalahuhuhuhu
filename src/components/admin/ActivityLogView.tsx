import React, { useState, useEffect } from 'react';
import { 
  History, 
  Filter, 
  RefreshCw, 
  Globe, 
  FolderTree, 
  Inbox, 
  Settings, 
  Clock, 
  ShieldCheck,
  User
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { fetchActivityLogs } from '../../lib/firestoreService';
import { ActivityLog } from '../../types';

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchActivityLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterType === 'all') return true;
    return log.entityType === filterType;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'website': return <Globe className="w-3.5 h-3.5 text-indigo-400" />;
      case 'category': return <FolderTree className="w-3.5 h-3.5 text-teal-400" />;
      case 'submission': return <Inbox className="w-3.5 h-3.5 text-purple-400" />;
      case 'settings': return <Settings className="w-3.5 h-3.5 text-sky-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <AdminLayout
      title="Audit & Activity Log"
      subtitle="Complete immutable trail of website mutations, category updates, and admin actions."
      actions={
        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-4 max-w-5xl">
        {/* Filter bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Filter By Entity:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['all', 'website', 'category', 'submission', 'settings'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading activity trail...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-200">No activity logs found</p>
              <p className="text-xs text-slate-400 mt-1">
                Admin CRUD operations will automatically appear here as they occur.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                      {getEntityIcon(log.entityType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-100">{log.action}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                            ID: {log.entityId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{log.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {log.adminId}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 sm:mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
