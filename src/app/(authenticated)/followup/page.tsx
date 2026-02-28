'use client';

import { useState, useEffect } from 'react';
import { api, isApiConfigured } from '@/lib/api';

interface FollowupItem {
  id: string;
  project_number: string;
  customer_name: string;
  status: string;
  estimate_date?: string;
  days_since_estimate?: number;
  is_overdue?: boolean;
  assigned_to_name?: string;
}

function StatusBadge({ isOverdue, days }: { isOverdue?: boolean; days?: number }) {
  if (isOverdue) return <span className="badge badge-red">期限超過</span>;
  if (days !== undefined && days > 3) return <span className="badge badge-yellow">注意</span>;
  return <span className="badge badge-green">余裕</span>;
}

export default function FollowupPage() {
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getFollowups().then((res) => {
      if (res.success && res.data) {
        setFollowups(res.data.followups as unknown as FollowupItem[]);
        setOverdueCount(res.data.overdue_count);
      }
      setLoading(false);
    });
  }, []);

  const handleDone = (id: string) => {
    setFollowups((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">追客管理（{followups.length}件）</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            期限超過: <strong className="text-red-600">{overdueCount}件</strong>
          </span>
        </div>
      </div>

      <div className="space-y-0">
        {followups.map((item) => (
          <div key={item.id} className={`followup-card ${item.is_overdue ? 'urgent' : ''}`}>
            <div className="flex flex-wrap justify-between gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-gray-800">{item.customer_name} / {item.project_number}</span>
                  <StatusBadge isOverdue={item.is_overdue} days={item.days_since_estimate} />
                  {item.days_since_estimate !== undefined && (
                    <span className="text-sm text-gray-500">
                      {item.is_overdue ? `${item.days_since_estimate}日超過` : `${item.days_since_estimate}日経過`}
                    </span>
                  )}
                </div>
                {item.estimate_date && <p className="text-sm text-gray-500">見積もり日: {String(item.estimate_date).substring(0, 10)}</p>}
                {item.assigned_to_name && <p className="text-sm text-gray-500">担当: {item.assigned_to_name}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" className="btn-primary text-sm py-2" onClick={() => handleDone(item.id)}>対応済み</button>
                <button type="button" className="btn-secondary text-sm py-2" onClick={() => handleDone(item.id)}>スキップ</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {followups.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
          <span className="material-icons text-5xl mb-2">check_circle</span>
          <p>対応が必要な追客はありません</p>
        </div>
      )}
    </div>
  );
}
