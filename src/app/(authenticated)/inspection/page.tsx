'use client';

import { useState, useEffect } from 'react';
import { api, isApiConfigured } from '@/lib/api';

interface InspectionItem {
  project_id: string;
  project_number: string;
  customer_name: string;
  address?: string;
  inspection_type: string;
  completion_date?: string;
  months_since?: number;
  assigned_to_name?: string;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; label: string }> = {
    scheduled: { class: 'badge-blue', label: '予定' },
    completed: { class: 'badge-green', label: '完了' },
    overdue: { class: 'badge-red', label: '期限超過' },
  };
  const { class: c, label } = config[status] ?? { class: 'badge-gray', label: status };
  return <span className={`badge ${c}`}>{label}</span>;
}

const TYPE_LABELS: Record<string, string> = { '1year': '1年点検', '3year': '3年点検' };

export default function InspectionPage() {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getInspections().then((res) => {
      if (res.success && res.data?.inspections) setInspections(res.data.inspections as InspectionItem[]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">点検スケジュール（{inspections.length}件）</h2>
      </div>

      <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />予定</span>
        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />完了</span>
      </div>

      <div className="space-y-0">
        {inspections.map((item, idx) => (
          <div key={`${item.project_id}-${item.inspection_type}-${idx}`} className="inspection-item">
            <div className="shrink-0 w-24 text-center">
              <StatusBadge status={item.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold">{item.customer_name}</span>
                <span className="text-gray-500">{item.project_number}</span>
                <span className="badge badge-blue">{TYPE_LABELS[item.inspection_type] ?? item.inspection_type}</span>
              </div>
              {item.address && <p className="text-sm text-gray-600">{item.address}</p>}
              {item.assigned_to_name && <p className="text-sm text-gray-500">担当: {item.assigned_to_name}</p>}
            </div>
          </div>
        ))}
      </div>

      {inspections.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
          <span className="material-icons text-5xl mb-2">event_busy</span>
          <p>点検予定はありません</p>
        </div>
      )}
    </div>
  );
}
