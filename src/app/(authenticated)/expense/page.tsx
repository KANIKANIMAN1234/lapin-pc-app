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
  accountingImported: boolean;
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    Promise.all([
      api.getProjects({ limit: '200' }),
      api.getExpenses({ limit: '100' }),
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
          accountingImported: !!(e.accounting_imported),
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
      expense_date: date, amount: Number(amount), category,
      description: memo, project_id: project || '', receipt_image: receiptBase64 || '',
    });
    if (res.success) {
      const opt = projectOptions.find((o) => o.value === project);
      const pNum = opt ? opt.label.split(' ')[0] : '';
      const cName = opt ? opt.label.split(' ').slice(1).join(' ') : '';
      setExpenses((prev) => [{
        id: String(Date.now()), date, category, amount: Number(amount),
        projectNumber: pNum, customerName: cName, description: memo,
        userName: '', status: 'pending', notes: '', accountingImported: false,
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

  const handleToggleAccounting = async (expenseId: string, current: boolean) => {
    setTogglingId(expenseId);
    const newVal = !current;
    setExpenses((prev) => prev.map((ex) => ex.id === expenseId ? { ...ex, accountingImported: newVal } : ex));
    const res = await api.updateExpenseAccounting(expenseId, newVal);
    if (!res.success) {
      setExpenses((prev) => prev.map((ex) => ex.id === expenseId ? { ...ex, accountingImported: current } : ex));
      setToast({ show: true, message: '更新に失敗しました', type: 'error' });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
    }
    setTogglingId(null);
  };

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(thisMonthStr));
  const unprocessedCount = monthlyExpenses.filter((e) => !e.accountingImported).length;
  const totalMonthly = monthlyExpenses.length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">経費登録</h2>
      <div className="expense-layout">
        <div className="expense-form-card">
          <h3 className="font-bold mb-5 text-base">新規経費登録</h3>
          <form onSubmit={handleSubmit}>
            {/* レシートアップロード＆プレビュー（横並び） */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-colors min-h-[120px]"
              >
                <span className="material-icons text-3xl text-green-500 mb-1">cloud_upload</span>
                <p className="text-sm font-medium text-green-600">レシート・領収書を</p>
                <p className="text-sm font-medium text-green-600">アップロード</p>
                <p className="text-xs text-gray-400 mt-1">クリックしてから添付</p>
              </div>
              <div className="border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center min-h-[120px] overflow-hidden">
                {receiptPreview ? (
                  <img src={receiptPreview} alt="レシート" className="max-h-full max-w-full object-contain" />
                ) : (
                  <>
                    <span className="material-icons text-3xl text-gray-300 mb-1">image</span>
                    <p className="text-xs text-gray-400 text-center px-2">アップロードした写真が<br />ここに表示されます</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客番号 / 案件</label>
                <select value={project} onChange={(e) => setProject(e.target.value)} className="form-input">
                  <option value="">案件を選択</option>
                  {projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金額</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input" placeholder="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="form-input" placeholder="品目や用途を入力" />
              </div>
            </div>
            <button type="submit" className="mt-6 w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50" disabled={submitting}>
              <span className="material-icons">cloud_upload</span>{submitting ? '登録中...' : 'スプレッドシートに登録'}
            </button>
          </form>
        </div>

        <div className="expense-history-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <span className="material-icons">receipt_long</span>経費処理管理
            </h3>
            <div className="flex items-center gap-3">
              {unprocessedCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <span className="material-icons" style={{ fontSize: 14 }}>warning</span>
                  未処理 {unprocessedCount}件
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  <span className="material-icons" style={{ fontSize: 14 }}>check_circle</span>
                  処理完了
                </span>
              )}
              <span className="text-xs text-gray-400">今月 {totalMonthly}件</span>
            </div>
          </div>

          <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div className="text-blue-600">
                  <span className="font-bold text-lg">{unprocessedCount}</span> / {totalMonthly}
                  <span className="ml-1 text-blue-500">未取込</span>
                </div>
                <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden" style={{ minWidth: 80 }}>
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: totalMonthly > 0 ? `${((totalMonthly - unprocessedCount) / totalMonthly) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-xs text-blue-500 font-medium">
                {totalMonthly > 0 ? Math.round(((totalMonthly - unprocessedCount) / totalMonthly) * 100) : 0}% 完了
              </span>
            </div>
          </div>

          <div className="space-y-2" style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            {expenses.map((item) => {
              const isToggling = togglingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-l-4 ${item.accountingImported ? 'border-gray-300 bg-gray-50/60' : 'border-orange-400 bg-orange-50/40'} hover:bg-gray-100 transition-colors`}
                >
                  <div className="flex items-start gap-2">
                    <label className="flex items-center mt-0.5 cursor-pointer shrink-0" title="会計ソフト取込済み">
                      <input
                        type="checkbox"
                        checked={item.accountingImported}
                        onChange={() => handleToggleAccounting(item.id, item.accountingImported)}
                        disabled={isToggling}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-500">{item.date}</span>
                          <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 5px' }}>{item.category}</span>
                          {item.accountingImported && (
                            <span className="badge badge-blue" style={{ fontSize: 9, padding: '0px 4px' }}>取込済</span>
                          )}
                        </div>
                        <span className={`font-bold whitespace-nowrap ${item.accountingImported ? 'text-gray-400' : 'text-gray-800'}`}>
                          ¥{item.amount.toLocaleString()}
                        </span>
                      </div>
                      {item.description && (
                        <p className={`text-sm mt-1 font-medium ${item.accountingImported ? 'text-gray-400' : 'text-gray-800'}`}>{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {item.userName && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="material-icons" style={{ fontSize: 12 }}>person</span>
                            {item.userName}
                          </span>
                        )}
                        {(item.projectNumber || item.customerName) && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="material-icons" style={{ fontSize: 12 }}>folder</span>
                            {item.projectNumber}{item.customerName ? ` ${item.customerName}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
