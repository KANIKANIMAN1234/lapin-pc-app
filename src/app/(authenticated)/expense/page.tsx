'use client';

import { useState, useRef, useEffect } from 'react';
import { api, isApiConfigured } from '@/lib/api';
import type { Project } from '@/types';

const CATEGORY_OPTIONS = ['材料費', '交通費', '外注費', '消耗品費', '飲食費', 'その他'] as const;

interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  amount: number;
  projectNumber: string;
  customerName: string;
  description: string;
  userName: string;
  status: string;
  notes: string;
}

export default function ExpensePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{ amount: number; date: string; store_name: string; items: string; category: string } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>('その他');
  const [memo, setMemo] = useState('');
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    Promise.all([
      api.getProjects({ limit: '200' }),
      api.getExpenses({ limit: '50' }),
    ]).then(([projRes, expRes]) => {
      if (projRes.success && projRes.data?.projects) {
        setProjectOptions(projRes.data.projects.map((p: Project) => ({
          value: String(p.id),
          label: `${p.project_number} ${p.customer_name}`,
        })));
      }
      if (expRes.success && expRes.data?.expenses) {
        const raw = expRes.data.expenses as unknown as Record<string, unknown>[];
        setExpenses(raw.map((e) => ({
          id: String(e.id),
          date: String(e.expense_date || e.date || '').substring(0, 10),
          category: String(e.category || ''),
          amount: Number(e.amount) || 0,
          projectNumber: String(e.project_number || ''),
          customerName: String(e.customer_name || ''),
          description: String(e.description || ''),
          userName: String(e.user_name || ''),
          status: String(e.status || ''),
          notes: String(e.notes || ''),
        })));
      }
      setLoading(false);
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptBase64(base64);
      if (isApiConfigured()) {
        setOcrLoading(true);
        const res = await api.ocrReceipt({ photo_data: base64 });
        if (res.success && res.data) {
          setOcrResult(res.data);
          if (res.data.amount) setAmount(String(res.data.amount));
          if (res.data.date) setDate(res.data.date);
          if (res.data.category) setCategory(res.data.category);
          if (res.data.items) setMemo(res.data.items);
        }
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    const res = await api.createExpense({
      expense_date: date,
      amount: Number(amount),
      category,
      description: memo,
      project_id: project || '',
      receipt_image: receiptBase64 || '',
    });
    if (res.success) {
      const opt = projectOptions.find((o) => o.value === project);
      const pNum = opt ? opt.label.split(' ')[0] : '';
      const cName = opt ? opt.label.split(' ').slice(1).join(' ') : '';
      setExpenses((prev) => [{
        id: String(Date.now()), date, category, amount: Number(amount),
        projectNumber: pNum, customerName: cName, description: memo,
        userName: '', status: 'pending', notes: '',
      }, ...prev]);
      setProject(''); setAmount(''); setDate(new Date().toISOString().slice(0, 10)); setCategory('その他'); setMemo('');
      setReceiptPreview(null); setReceiptBase64(null); setOcrResult(null);
      setToast({ show: true, message: 'スプレッドシートに登録しました', type: 'success' });
    } else {
      setToast({ show: true, message: res.error || '登録に失敗しました', type: 'error' });
    }
    setSubmitting(false);
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">経費登録</h2>
      <div className="expense-layout">
        <div className="expense-form-card">
          <h3 className="font-bold mb-4 flex items-center gap-2"><span className="material-icons">add_circle</span>新規経費登録</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">レシート・領収書</label>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-colors">
                <span className="material-icons text-4xl text-gray-400">cloud_upload</span>
                <p className="mt-2 text-gray-600 text-sm">レシート・領収書をアップロード</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
            {receiptPreview && (
              <>
                <div className="mb-4">
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100 h-32 flex items-center justify-center">
                    <img src={receiptPreview} alt="レシート" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                {ocrLoading && <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-500">OCR読み取り中...</div>}
                {ocrResult && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">OCR結果（参考）</p>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>金額: ¥{ocrResult.amount?.toLocaleString()}</p>
                      <p>日付: {ocrResult.date}</p>
                      <p>店舗: {ocrResult.store_name}</p>
                      <p>品目: {ocrResult.items}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">案件</label>
                <select value={project} onChange={(e) => setProject(e.target.value)} className="form-input">
                  <option value="">共通経費（案件なし）</option>
                  {projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">金額 (円)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input" placeholder="例: 12500" required />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" required />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="form-input" placeholder="例: 塗料・ローラー購入" />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
              <span className="material-icons">cloud_upload</span>{submitting ? '登録中...' : 'スプレッドシートに登録'}
            </button>
          </form>
        </div>

        <div className="expense-history-card">
          <h3 className="font-bold mb-4 flex items-center gap-2"><span className="material-icons">history</span>最近の経費登録</h3>
          <div className="space-y-2">
            {expenses.map((item) => {
              const statusLabel = item.status === 'approved' ? '承認済' : item.status === 'rejected' ? '却下' : '申請中';
              const statusClass = item.status === 'approved' ? 'badge-green' : item.status === 'rejected' ? 'badge-red' : 'badge-yellow';
              return (
                <div key={item.id} className="p-3 rounded-lg border-l-4 border-green-500 bg-gray-50 hover:bg-gray-100">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">{item.date}</span>
                      <span className="badge badge-green">{item.category}</span>
                      <span className={`badge ${statusClass}`} style={{ fontSize: '10px', padding: '1px 6px' }}>{statusLabel}</span>
                    </div>
                    <span className="font-bold text-gray-800 whitespace-nowrap">¥{item.amount.toLocaleString()}</span>
                  </div>
                  {item.description && <p className="text-sm text-gray-800 mt-1.5 font-medium">{item.description}</p>}
                  {(item.projectNumber || item.customerName) && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle' }}>folder</span>{' '}
                      {item.projectNumber}{item.customerName ? ` ${item.customerName}` : ''}
                    </p>
                  )}
                  {item.userName && <p className="text-xs text-gray-400 mt-0.5">登録者: {item.userName}</p>}
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
                </div>
              );
            })}
            {expenses.length === 0 && <p className="text-center text-gray-500 py-4">経費データがありません</p>}
          </div>
        </div>
      </div>
      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
