'use client';

import { useState, useEffect, useRef } from 'react';
import { api, isApiConfigured } from '@/lib/api';
import type { Project } from '@/types';

type TemplateType = 'thankyou' | 'seasonal' | 'campaign';

interface TemplateConfig {
  id: TemplateType;
  label: string;
  icon: string;
  iconColor: string;
  previewTitle: string;
  previewBody: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'thankyou',
    label: 'お礼状',
    icon: 'favorite',
    iconColor: '#ef4444',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: 'この度はリフォーム工事にご依頼いただき誠にありがとうございました。\n今後もお住まいのことでお気軽にご相談ください。\n今後ともどうぞよろしくお願いいたします。',
  },
  {
    id: 'seasonal',
    label: '季節DM',
    icon: 'pets',
    iconColor: '#374151',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: '春の訪れと共に、ご挨拶申し上げます。\n季節の変わり目は外壁や屋根の点検に最適な時期です。\n無料点検も承っておりますので、お気軽にお問い合わせください。',
  },
  {
    id: 'campaign',
    label: 'キャンペーン',
    icon: 'auto_awesome',
    iconColor: '#374151',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: '春のリフォームキャンペーン実施中です。\n期間中のご契約で工事費用を最大10%割引いたします。\nこの機会にぜひご検討ください。',
  },
];

interface SendListItem {
  id: string;
  name: string;
  lastWork: string;
  lastWorkDate: string;
  status: string;
}

export default function ThankYouPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('thankyou');
  const [sendList, setSendList] = useState<SendListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [sending, setSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentTemplate = TEMPLATES.find((t) => t.id === activeTemplate)!;

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getProjects({ limit: '500' }).then((res) => {
      if (res.success && res.data?.projects) {
        const items = res.data.projects
          .filter((p: Project) => p.status === 'completed' || p.status === 'in_progress' || p.status === 'contract')
          .map((p: Project) => {
            const dateStr = String(p.completion_date || p.start_date || p.inquiry_date || '').substring(0, 7).replace('-', '.');
            const workType = Array.isArray(p.work_type) ? p.work_type.join(', ') : p.work_type || '';
            return {
              id: String(p.id),
              name: p.customer_name,
              lastWork: workType,
              lastWorkDate: dateStr,
              status: p.status === 'completed' ? '完工' : p.status === 'in_progress' ? '施工中' : '契約済',
            };
          });
        setSendList(items);
      }
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sendList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sendList.map((c) => c.id)));
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    const selectedNames = sendList.filter((r) => selectedIds.has(r.id)).map((r) => r.name);
    setTimeout(() => {
      alert(`以下の${selectedNames.length}件に「${currentTemplate.label}」を送付しました:\n${selectedNames.join('\n')}`);
      setSending(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
        <p className="ml-3 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">お礼状・DM管理</h2>

      <div className="flex gap-6">
        {/* === 左: テンプレート選択 === */}
        <div className="flex-shrink-0" style={{ width: 170 }}>
          <h3 className="text-xs font-bold text-gray-600 mb-2">テンプレート選択</h3>
          <div className="flex flex-col gap-1.5">
            {TEMPLATES.map((t) => {
              const isActive = activeTemplate === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTemplate(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-green-100 border border-green-400 shadow-sm'
                      : 'bg-transparent border border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="material-icons"
                    style={{ fontSize: 18, color: isActive ? t.iconColor : '#9ca3af' }}
                  >
                    {t.icon}
                  </span>
                  <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* === 中央: プレビュー === */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-gray-600 mb-2">プレビュー</h3>
          <div
            ref={printRef}
            className="border border-gray-200 rounded-xl bg-white p-6 min-h-[200px] shadow-sm"
          >
            <div className="font-bold text-base text-gray-900 mb-3">
              {currentTemplate.previewTitle}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {currentTemplate.previewBody}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing}
            className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span className="material-icons" style={{ fontSize: 18 }}>print</span>
            {printing ? '印刷中...' : '印刷'}
          </button>
        </div>

        {/* === 右: 送付リスト === */}
        <div className="flex-shrink-0 border-l border-gray-200 pl-5" style={{ width: 250 }}>
          <h3 className="text-xs font-bold text-gray-600 mb-2">
            送付リスト（{sendList.length}件）
          </h3>

          <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-0.5 w-5">
                    <input
                      type="checkbox"
                      checked={sendList.length > 0 && selectedIds.size === sendList.length}
                      onChange={toggleSelectAll}
                      className="rounded w-3 h-3 accent-green-600"
                    />
                  </th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">顧客名</th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">最終工事</th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {sendList.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-0.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded w-3 h-3 accent-green-600"
                      />
                    </td>
                    <td className="py-1.5 px-0.5 text-gray-800 whitespace-nowrap">{row.name}</td>
                    <td className="py-1.5 px-0.5 text-gray-500">
                      <div>{row.lastWorkDate}</div>
                      <div className="text-[10px]">{row.lastWork}</div>
                    </td>
                    <td className="py-1.5 px-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.status === '完工'
                            ? 'bg-purple-100 text-purple-700'
                            : row.status === '施工中'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {sendList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 text-xs">
                      対象顧客がいません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">{selectedIds.size}件選択中</span>
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedIds.size === 0 || sending}
              className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>play_arrow</span>
              {sending ? '送付中...' : '送付実行'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
