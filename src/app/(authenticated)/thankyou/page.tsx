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
      <div className="thankyou-layout">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">テンプレート選択</h3>
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTemplate(t.id)} className={`template-card ${activeTemplate === t.id ? 'active' : ''}`}>
              <span className="material-icons text-xl">{t.icon}</span>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-gray-700">プレビュー</h3>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm p-6">
            <div className="font-bold mb-2">株式会社ラパンリフォーム</div>
            <p className="text-sm text-gray-700">
              {activeTemplate === 'thankyou' && 'この度はリフォーム工事にご依頼いただき誠にありがとうございました。'}
              {activeTemplate === 'seasonal' && '春の訪れと共に、ご挨拶申し上げます。'}
              {activeTemplate === 'campaign' && '春のリフォームキャンペーン実施中です。'}
            </p>
          </div>
          <button type="button" className="btn-primary">
            <span className="material-icons text-lg">print</span>印刷
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">送付リスト（{sendList.length}件）</h3>
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left p-2 w-8"><input type="checkbox" checked={sendList.length > 0 && selectedIds.size === sendList.length} onChange={toggleSelectAll} className="rounded" /></th>
              <th className="text-left p-2 font-semibold text-gray-600">顧客名</th>
              <th className="text-left p-2 font-semibold text-gray-600">最終工事</th>
              <th className="text-left p-2 font-semibold text-gray-600">ステータス</th>
            </tr></thead>
            <tbody>
              {sendList.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-2"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded" /></td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-gray-600">{row.lastWork}</td>
                  <td className="p-2"><span className={`badge ${row.status === '完工' ? 'badge-green' : row.status === '施工中' ? 'badge-blue' : 'badge-purple'}`}>{row.status}</span></td>
                </tr>
              ))}
              {sendList.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-500">対象顧客がいません</td></tr>}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">{selectedIds.size}件選択中</span>
            <button type="button" className="btn-primary" disabled={selectedIds.size === 0}>
              <span className="material-icons text-lg">send</span>送付実行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
