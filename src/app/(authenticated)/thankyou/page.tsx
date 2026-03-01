'use client';

import { useState, useEffect } from 'react';
import { api, isApiConfigured } from '@/lib/api';
import type { Project } from '@/types';

type TemplateType = 'thankyou' | 'seasonal' | 'campaign';

const TEMPLATES = [
  { id: 'thankyou' as TemplateType, label: 'お礼状', icon: 'favorite' },
  { id: 'seasonal' as TemplateType, label: '季節DM', icon: 'ac_unit' },
  { id: 'campaign' as TemplateType, label: 'キャンペーン', icon: 'campaign' },
];

interface SendListItem {
  id: string;
  name: string;
  lastWork: string;
  status: string;
}

export default function ThankYouPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('thankyou');
  const [sendList, setSendList] = useState<SendListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getProjects({ limit: '500' }).then((res) => {
      if (res.success && res.data?.projects) {
        const completed = res.data.projects
          .filter((p: Project) => p.status === 'completed' || p.status === 'in_progress' || p.status === 'contract')
          .map((p: Project) => ({
            id: String(p.id),
            name: p.customer_name,
            lastWork: `${String(p.inquiry_date || '').substring(0, 7)} ${Array.isArray(p.work_type) ? p.work_type.join(',') : p.work_type || ''}`,
            status: p.status === 'completed' ? '完工' : p.status === 'in_progress' ? '施工中' : '契約済',
          }));
        setSendList(completed);
      }
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    selectedIds.size === sendList.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(sendList.map((c) => c.id)));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">お礼状・DM管理</h2>
      <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr 260px' }}>
        {/* テンプレート選択 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">テンプレート選択</h3>
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplate(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  activeTemplate === t.id
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`material-icons text-lg ${activeTemplate === t.id ? 'text-green-600' : 'text-gray-400'}`}>{t.icon}</span>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* プレビュー */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h3>
          <div className="border border-green-200 rounded-xl bg-green-50/30 p-6 min-h-[180px]">
            <div className="font-bold text-gray-900 mb-3">株式会社ラパンリフォーム</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {activeTemplate === 'thankyou' && 'この度はリフォーム工事にご依頼いただき誠にありがとうございました。'}
              {activeTemplate === 'seasonal' && '春の訪れと共に、ご挨拶申し上げます。'}
              {activeTemplate === 'campaign' && '春のリフォームキャンペーン実施中です。'}
            </p>
          </div>
          <button type="button" className="btn-primary mt-4 inline-flex items-center gap-1.5">
            <span className="material-icons text-lg">print</span>印刷
          </button>
        </div>

        {/* 送付リスト */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">送付リスト（{sendList.length}件）</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-1 w-6">
                  <input type="checkbox" checked={sendList.length > 0 && selectedIds.size === sendList.length} onChange={toggleSelectAll} className="rounded w-3.5 h-3.5" />
                </th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-500">顧客名</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-500">最終工事</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-500">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {sendList.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-1">
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded w-3.5 h-3.5" />
                  </td>
                  <td className="py-1.5 px-1 text-gray-800">{row.name}</td>
                  <td className="py-1.5 px-1 text-gray-500">{row.lastWork}</td>
                  <td className="py-1.5 px-1">
                    <span className={`badge ${row.status === '完工' ? 'badge-purple' : row.status === '施工中' ? 'badge-blue' : 'badge-green'}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
              {sendList.length === 0 && (
                <tr><td colSpan={4} className="text-center py-4 text-gray-400 text-xs">対象顧客がいません</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{selectedIds.size}件選択中</span>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-icons text-base">play_arrow</span>送付実行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
