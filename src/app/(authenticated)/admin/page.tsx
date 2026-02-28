'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';

type TabId = 'integration' | 'company' | 'employees';

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  role: string;
  line_user_id?: string;
  is_deleted: boolean;
  created_at?: string;
}

function InputRow({
  icon, value, onChange, type = 'text', placeholder, onSave, onOpen,
}: {
  icon: string; value: string; onChange: (v: string) => void; type?: 'text' | 'password' | 'url'; placeholder?: string; onSave?: () => void; onOpen?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex items-center gap-2">
      <span className="material-icons text-gray-500 text-xl" style={{ minWidth: 24 }}>{icon}</span>
      <input type={isPassword && !visible ? 'password' : 'text'} className="form-input flex-1" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {onOpen && <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={onOpen}><span className="material-icons text-gray-600">open_in_new</span></button>}
      {isPassword && <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => setVisible(!visible)}><span className="material-icons text-gray-600">{visible ? 'visibility_off' : 'visibility'}</span></button>}
      {onSave && <button type="button" className="btn-primary py-1.5 px-3 text-sm" onClick={onSave}><span className="material-icons text-base mr-0.5">save</span>保存</button>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('integration');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [empFilter, setEmpFilter] = useState<'all' | 'active' | 'retired'>('all');
  const [empLoading, setEmpLoading] = useState(false);

  const [channelId, setChannelId] = useState('');
  const [channelToken, setChannelToken] = useState('');
  const [liffId, setLiffId] = useState('');
  const [gasUrl, setGasUrl] = useState(process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '');

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    if (activeTab === 'employees' && isApiConfigured() && employees.length === 0) {
      setEmpLoading(true);
      api.getEmployees().then((res) => {
        if (res.success && res.data?.employees) {
          setEmployees(res.data.employees.map((e) => ({
            id: String(e.id),
            name: e.name,
            email: e.email,
            role: e.role,
            line_user_id: e.line_user_id,
            is_deleted: !!(e as unknown as Record<string, unknown>).is_deleted,
          })));
        }
        setEmpLoading(false);
      });
    }
  }, [activeTab, employees.length]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <span className="material-icons text-6xl text-gray-300 mb-4">lock</span>
          <p className="text-xl font-semibold text-gray-600">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  const filteredEmployees = employees.filter((e) => {
    if (empFilter === 'active') return !e.is_deleted;
    if (empFilter === 'retired') return e.is_deleted;
    return true;
  });

  const handleRetire = async (emp: EmployeeRow) => {
    const res = await api.updateEmployee({ employee_id: emp.id, is_deleted: true });
    if (res.success) {
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, is_deleted: true } : e));
      showToast('退職処理を実行しました');
    } else {
      showToast(String(res.error || '失敗しました'), 'error');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">管理</h2>
      <div className="admin-tabs flex flex-wrap gap-2">
        {[
          { id: 'integration' as TabId, label: '連携設定' },
          { id: 'company' as TabId, label: '企業情報' },
          { id: 'employees' as TabId, label: '従業員管理' },
        ].map((t) => (
          <button key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'integration' && (
        <div className="settings-grid">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold flex items-center gap-2"><span className="material-icons text-green-600">forum</span>LINE連携設定</h3></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">チャネルID</label><InputRow icon="tag" value={channelId} onChange={setChannelId} onSave={() => showToast('保存しました')} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">チャネルアクセストークン</label><InputRow icon="token" value={channelToken} onChange={setChannelToken} type="password" onSave={() => showToast('保存しました')} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">LIFF ID</label><InputRow icon="code" value={liffId} onChange={setLiffId} onSave={() => showToast('保存しました')} /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold flex items-center gap-2"><span className="material-icons text-green-600">integration_instructions</span>GAS連携</h3></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">GAS WebアプリURL</label><InputRow icon="link" value={gasUrl} onChange={setGasUrl} type="url" onSave={() => showToast('保存しました')} onOpen={() => gasUrl && window.open(gasUrl, '_blank')} /></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
          <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold">企業情報</h3></div>
          <div className="p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">会社名</label><input type="text" className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">屋号</label><input type="text" className="form-input" value={tradeName} onChange={(e) => setTradeName(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">代表者</label><input type="text" className="form-input" value={representative} onChange={(e) => setRepresentative(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">住所</label><input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label><input type="text" className="form-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} /></div>
            <button type="button" className="btn-primary" onClick={() => showToast('企業情報を保存しました')}>保存</button>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold flex items-center gap-2"><span className="material-icons text-green-600">group</span>従業員一覧</h3>
            <div className="flex gap-2">
              {(['all', 'active', 'retired'] as const).map((f) => (
                <button key={f} className={`admin-tab ${empFilter === f ? 'active' : ''}`} onClick={() => setEmpFilter(f)}>{f === 'all' ? '全員' : f === 'active' ? '在籍' : '退職'}</button>
              ))}
            </div>
          </div>
          {empLoading ? (
            <div className="flex items-center justify-center py-12"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>氏名</th><th>役職</th><th>メール</th><th>LINE連携</th><th>ステータス</th><th>操作</th></tr></thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="font-medium">{emp.name}</td>
                      <td>{emp.role}</td>
                      <td>{emp.email}</td>
                      <td>{emp.line_user_id ? <span className="badge badge-green">済</span> : <span className="badge badge-gray">未</span>}</td>
                      <td><span className={emp.is_deleted ? 'badge badge-gray' : 'badge badge-green'}>{emp.is_deleted ? '退職' : '在籍'}</span></td>
                      <td>
                        {!emp.is_deleted && (
                          <button type="button" className="text-red-600 hover:underline text-sm" onClick={() => handleRetire(emp)}>退職</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">該当する従業員がいません</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
