'use client';

import { useState, useEffect, useCallback } from 'react';
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
  updated_at?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  manager: '営業マネージャー',
  sales: '営業',
  staff: 'スタッフ',
  office: '事務',
};

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
  const [empError, setEmpError] = useState('');

  const [channelId, setChannelId] = useState('');
  const [channelToken, setChannelToken] = useState('');
  const [liffId, setLiffId] = useState('');
  const [gasUrl, setGasUrl] = useState(process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '');

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null);
  const [retireTarget, setRetireTarget] = useState<EmployeeRow | null>(null);

  // Register form
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regJoinDate, setRegJoinDate] = useState('');
  const [regLineId, setRegLineId] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Retire form
  const [retireDate, setRetireDate] = useState('');
  const [retireReason, setRetireReason] = useState('自己都合');

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = useCallback(() => {
    if (!isApiConfigured()) return;
    setEmpLoading(true);
    setEmpError('');
    api.getEmployees().then((res) => {
      if (res.success && res.data?.employees) {
        setEmployees(res.data.employees.map((e) => ({
          id: String(e.id),
          name: e.name || '',
          email: e.email || '',
          role: e.role || 'staff',
          line_user_id: e.line_user_id,
          is_deleted: !!(e as unknown as Record<string, unknown>).is_deleted,
          created_at: String((e as unknown as Record<string, unknown>).created_at || ''),
          updated_at: String((e as unknown as Record<string, unknown>).updated_at || ''),
        })));
      } else {
        const errMsg = typeof res.error === 'object' && res.error !== null
          ? (res.error as Record<string, unknown>).message || JSON.stringify(res.error)
          : res.error || '従業員データの取得に失敗しました';
        setEmpError(String(errMsg));
      }
      setEmpLoading(false);
    }).catch((err) => {
      setEmpError(String(err));
      setEmpLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'employees' && employees.length === 0 && !empError) {
      fetchEmployees();
    }
  }, [activeTab, employees.length, empError, fetchEmployees]);

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

  // --- Register ---
  const openRegisterModal = () => {
    setRegName(''); setRegRole(''); setRegEmail(''); setRegPhone('');
    setRegJoinDate(new Date().toISOString().split('T')[0]); setRegLineId('');
    setShowRegisterModal(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api.createEmployee({
      name: regName, role: regRole, email: regEmail, line_user_id: regLineId || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      showToast(`${regName} さんを登録しました`);
      setShowRegisterModal(false);
      setEmployees([]);
      setEmpError('');
    } else {
      showToast(String(typeof res.error === 'object' ? (res.error as Record<string, unknown>).message : res.error) || '登録に失敗しました', 'error');
    }
  };

  // --- Edit ---
  const openEditModal = (emp: EmployeeRow) => {
    setEditTarget(emp);
    setEditName(emp.name); setEditRole(emp.role); setEditEmail(emp.email); setEditPhone('');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    const res = await api.updateEmployee({
      employee_id: editTarget.id, name: editName, role: editRole, email: editEmail,
    });
    setSubmitting(false);
    if (res.success) {
      showToast(`${editName} さんの情報を更新しました`);
      setShowEditModal(false);
      setEmployees([]);
      setEmpError('');
    } else {
      showToast(String(typeof res.error === 'object' ? (res.error as Record<string, unknown>).message : res.error) || '更新に失敗しました', 'error');
    }
  };

  // --- Retire ---
  const openRetireModal = (emp: EmployeeRow) => {
    setRetireTarget(emp);
    setRetireDate(new Date().toISOString().split('T')[0]);
    setRetireReason('自己都合');
    setShowRetireModal(true);
  };

  const handleRetire = async () => {
    if (!retireTarget || !retireDate) {
      showToast('退職日を入力してください', 'error');
      return;
    }
    setSubmitting(true);
    const res = await api.updateEmployee({ employee_id: retireTarget.id, is_deleted: true });
    setSubmitting(false);
    if (res.success) {
      showToast(`${retireTarget.name} さんの退職処理が完了しました。PC版・モバイル版ともにログイン不可となります。`);
      setShowRetireModal(false);
      setEmployees([]);
      setEmpError('');
    } else {
      showToast(String(typeof res.error === 'object' ? (res.error as Record<string, unknown>).message : res.error) || '退職処理に失敗しました', 'error');
    }
  };

  // --- Restore ---
  const handleRestore = async (emp: EmployeeRow) => {
    if (!confirm(`${emp.name} さんを復職させますか？`)) return;
    setSubmitting(true);
    const res = await api.updateEmployee({ employee_id: emp.id, is_deleted: false });
    setSubmitting(false);
    if (res.success) {
      showToast(`${emp.name} さんを復職させました`);
      setEmployees([]);
      setEmpError('');
    } else {
      showToast(String(typeof res.error === 'object' ? (res.error as Record<string, unknown>).message : res.error) || '復職処理に失敗しました', 'error');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('ja-JP');
    } catch { return d; }
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
          <div className="emp-header p-4 border-b border-gray-100">
            <div className="emp-header-left">
              <h3><span className="material-icons text-green-600">badge</span>従業員一覧</h3>
              <div className="emp-filter-group">
                {(['all', 'active', 'retired'] as const).map((f) => (
                  <button key={f} className={`emp-filter-btn ${empFilter === f ? 'active' : ''}`} onClick={() => setEmpFilter(f)}>
                    {f === 'all' ? '全員' : f === 'active' ? '在籍' : '退職'}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={openRegisterModal}>
              <span className="material-icons text-base">person_add</span>新規登録
            </button>
          </div>

          {empError && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-semibold flex items-center gap-1"><span className="material-icons text-base">error</span>エラー</p>
              <p className="text-sm mt-1">{empError}</p>
              <button type="button" className="mt-2 text-sm text-red-600 hover:underline" onClick={() => { setEmpError(''); setEmployees([]); }}>再試行</button>
            </div>
          )}

          {empLoading ? (
            <div className="flex items-center justify-center py-12"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>
          ) : (
            <div className="emp-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>氏名</th>
                    <th>役職</th>
                    <th>メール</th>
                    <th>LINE連携</th>
                    <th>登録日</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className={emp.is_deleted ? 'emp-row-retired' : ''}>
                      <td className="font-medium">{emp.name}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>
                      <td>{emp.email}</td>
                      <td>
                        {emp.line_user_id
                          ? <span className="emp-status emp-status-active"><span className="material-icons">check_circle</span>済</span>
                          : <span className="emp-status emp-status-retired"><span className="material-icons">cancel</span>未</span>
                        }
                      </td>
                      <td>
                        {formatDate(emp.created_at || '')}
                        {emp.is_deleted && <><br /><span className="text-xs text-red-600">退職済み</span></>}
                      </td>
                      <td>
                        {emp.is_deleted
                          ? <span className="emp-status emp-status-retired"><span className="material-icons">cancel</span>退職</span>
                          : <span className="emp-status emp-status-active"><span className="material-icons">check_circle</span>在籍</span>
                        }
                      </td>
                      <td className="emp-actions">
                        {emp.is_deleted ? (
                          <button className="emp-action-btn btn-restore" onClick={() => handleRestore(emp)} disabled={submitting}>
                            <span className="material-icons">undo</span>復職
                          </button>
                        ) : (
                          <>
                            <button className="emp-action-btn" onClick={() => openEditModal(emp)}>
                              <span className="material-icons">edit</span>編集
                            </button>
                            {emp.role !== 'admin' && (
                              <button className="emp-action-btn btn-retire" onClick={() => openRetireModal(emp)}>
                                <span className="material-icons">person_off</span>退職
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && !empLoading && !empError && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">該当する従業員がいません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 従業員登録モーダル */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">従業員登録</h3>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowRegisterModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                <div className="emp-form-grid">
                  <div className="form-group">
                    <label>氏名 <span className="required">*</span></label>
                    <input type="text" className="form-input" required placeholder="例: 中山太郎" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>役職 <span className="required">*</span></label>
                    <select className="form-input" required value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                      <option value="">選択してください</option>
                      <option value="admin">管理者</option>
                      <option value="manager">営業マネージャー</option>
                      <option value="sales">営業</option>
                      <option value="staff">スタッフ</option>
                      <option value="office">事務</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>メールアドレス</label>
                    <input type="email" className="form-input" placeholder="例: tanaka@lapin-reform.jp" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>携帯番号</label>
                    <input type="tel" className="form-input" placeholder="例: 090-0000-0000" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>入社日</label>
                    <input type="date" className="form-input" value={regJoinDate} onChange={(e) => setRegJoinDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>LINE連携ID</label>
                    <input type="text" className="form-input" placeholder="LINE User ID（任意）" value={regLineId} onChange={(e) => setRegLineId(e.target.value)} />
                  </div>
                </div>
                <div className="emp-form-note">
                  <span className="material-icons">info</span>
                  登録後、従業員がLINEログインすると自動的にアカウントが紐付けされます。
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>キャンセル</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <span className="material-icons text-base">person_add</span>{submitting ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 従業員編集モーダル */}
      {showEditModal && editTarget && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">従業員情報編集</h3>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowEditModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="emp-form-grid">
                  <div className="form-group">
                    <label>氏名</label>
                    <input type="text" className="form-input" required value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>役職</label>
                    <select className="form-input" required value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                      <option value="admin">管理者</option>
                      <option value="manager">営業マネージャー</option>
                      <option value="sales">営業</option>
                      <option value="staff">スタッフ</option>
                      <option value="office">事務</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>メールアドレス</label>
                    <input type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>携帯番号</label>
                    <input type="tel" className="form-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>キャンセル</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <span className="material-icons text-base">save</span>{submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 退職確認モーダル */}
      {showRetireModal && retireTarget && (
        <div className="modal-overlay" onClick={() => setShowRetireModal(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">退職処理の確認</h3>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowRetireModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="emp-retire-warning">
                <span className="material-icons">warning</span>
                <div>
                  <p><strong>{retireTarget.name}</strong> さんを退職処理します。</p>
                  <ul>
                    <li>PC版・モバイル版ともにログインが不可になります</li>
                    <li>全ページへのアクセス権限が無効化されます</li>
                    <li>過去の登録データは保持されます</li>
                  </ul>
                </div>
              </div>
              <div className="form-group">
                <label>退職日 <span className="required">*</span></label>
                <input type="date" className="form-input" required value={retireDate} onChange={(e) => setRetireDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>退職理由（任意）</label>
                <select className="form-input" value={retireReason} onChange={(e) => setRetireReason(e.target.value)}>
                  <option value="自己都合">自己都合</option>
                  <option value="会社都合">会社都合</option>
                  <option value="契約期間満了">契約期間満了</option>
                  <option value="定年退職">定年退職</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRetireModal(false)}>キャンセル</button>
              <button className="btn-danger" onClick={handleRetire} disabled={submitting}>
                <span className="material-icons text-base">person_off</span>{submitting ? '処理中...' : '退職処理を実行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
