'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, isApiConfigured } from '@/lib/api';
import type { Employee } from '@/types';

const WORK_TYPES = ['外壁塗装', '屋根塗装', '水回り', '内装リフォーム', 'エクステリア', 'その他'];
const ROUTES = ['紹介', 'チラシ', 'HP', 'ポータルサイト', '飛び込み', 'その他'];

export default function NewProjectPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const [form, setForm] = useState({
    customer_name: '',
    customer_name_kana: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    work_type: '',
    work_description: '',
    estimated_amount: '',
    acquisition_route: '',
    inquiry_date: new Date().toISOString().slice(0, 10),
    assigned_to: '',
    notes: '',
  });

  useEffect(() => {
    if (!isApiConfigured()) return;
    api.getEmployees().then((res) => {
      if (res.success && res.data?.employees) {
        setEmployees(res.data.employees.filter((e) => e.status !== 'retired'));
      }
    });
  }, []);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.address || !form.phone || !form.work_type || !form.estimated_amount || !form.acquisition_route || !form.inquiry_date) {
      showToast('必須項目をすべて入力してください', 'error');
      return;
    }
    if (!form.work_description) {
      form.work_description = form.work_type;
    }

    setSubmitting(true);
    const res = await api.createProject({
      ...form,
      estimated_amount: Number(form.estimated_amount) || 0,
    } as never);

    if (res.success) {
      showToast('案件を登録しました', 'success');
      setTimeout(() => router.push('/projects'), 1000);
    } else {
      showToast(res.error || '登録に失敗しました', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="header-icon-btn">
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold">新規案件登録</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左: 顧客情報 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="material-icons text-green-600" style={{ fontSize: 18 }}>person</span>
                顧客情報
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客名 <span className="text-red-500">*</span></label>
                <input type="text" className="form-input" value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} placeholder="例: 山田太郎" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客名（カナ）</label>
                <input type="text" className="form-input" value={form.customer_name_kana} onChange={(e) => update('customer_name_kana', e.target.value)} placeholder="例: ヤマダタロウ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                <input type="text" className="form-input" value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} placeholder="例: 530-0001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所 <span className="text-red-500">*</span></label>
                <input type="text" className="form-input" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="例: 大阪府大阪市北区梅田1-1-1" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 <span className="text-red-500">*</span></label>
                  <input type="tel" className="form-input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="例: 06-1234-5678" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input type="email" className="form-input" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="例: yamada@example.com" />
                </div>
              </div>
            </div>
          </div>

          {/* 右: 案件情報 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="material-icons text-green-600" style={{ fontSize: 18 }}>assignment</span>
                案件情報
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工事種別 <span className="text-red-500">*</span></label>
                <select className="form-input" value={form.work_type} onChange={(e) => update('work_type', e.target.value)} required>
                  <option value="">選択してください</option>
                  {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工事内容</label>
                <textarea className="form-input" rows={2} value={form.work_description} onChange={(e) => update('work_description', e.target.value)} placeholder="例: 外壁塗装・コーキング打替え" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">見込み金額（円） <span className="text-red-500">*</span></label>
                  <input type="number" className="form-input" value={form.estimated_amount} onChange={(e) => update('estimated_amount', e.target.value)} placeholder="例: 1500000" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">問い合わせ日 <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input" value={form.inquiry_date} onChange={(e) => update('inquiry_date', e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">取得経路 <span className="text-red-500">*</span></label>
                <select className="form-input" value={form.acquisition_route} onChange={(e) => update('acquisition_route', e.target.value)} required>
                  <option value="">選択してください</option>
                  {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">営業担当者</label>
                <select className="form-input" value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)}>
                  <option value="">自分が担当</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}（{emp.role}）</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="その他メモ" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>キャンセル</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={submitting}>
            <span className="material-icons text-lg">save</span>
            {submitting ? '登録中...' : '案件を登録'}
          </button>
        </div>
      </form>

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
