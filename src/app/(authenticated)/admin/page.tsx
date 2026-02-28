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

function PasswordUrlRow({
  icon, value, onChange, placeholder, onSave,
}: {
  icon: string; value: string; onChange: (v: string) => void; placeholder?: string; onSave: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="integration-url-row">
      <div className="integration-url-input">
        <span className="material-icons">{icon}</span>
        <input type={visible ? 'text' : 'password'} className="form-input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        <button className="integration-url-btn" onClick={() => setVisible(!visible)} title="表示/非表示"><span className="material-icons">{visible ? 'visibility_off' : 'visibility'}</span></button>
        <button className="integration-url-btn btn-save" onClick={onSave} title="保存"><span className="material-icons">save</span></button>
      </div>
    </div>
  );
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
  const [empError, setEmpError] = useState('');

  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [channelToken, setChannelToken] = useState('');
  const [liffId, setLiffId] = useState('');
  const [gasUrl, setGasUrl] = useState(process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '');
  const [gasScriptId, setGasScriptId] = useState('');
  const [sheetUrlExpense, setSheetUrlExpense] = useState('');
  const [sheetUrlProject, setSheetUrlProject] = useState('');
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [notifNewProject, setNotifNewProject] = useState(true);
  const [notifFollowup, setNotifFollowup] = useState(true);
  const [notifInspection, setNotifInspection] = useState(true);
  const [integrationLoaded, setIntegrationLoaded] = useState(false);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ status: 'idle' | 'testing' | 'ok' | 'fail'; message: string }>({ status: 'idle', message: '' });

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [corpNumber, setCorporateNumber] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [headerDisplay, setHeaderDisplay] = useState<'company' | 'trade'>('trade');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyLoaded, setCompanyLoaded] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'integration' && !integrationLoaded && isApiConfigured()) {
      setIntegrationLoading(true);
      api.getCompanySettings().then((res) => {
        if (res.success && res.data) {
          const d = res.data as Record<string, string>;
          setChannelId(d.line_channel_id || '');
          setChannelSecret(d.line_channel_secret || '');
          setChannelToken(d.line_access_token || '');
          setLiffId(d.line_liff_id || '');
          setGasUrl(d.gas_webapp_url || process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '');
          setGasScriptId(d.gas_script_id || '');
          setSheetUrlExpense(d.sheet_url_expense || '');
          setSheetUrlProject(d.sheet_url_project || '');
          setGdriveUrl(d.gdrive_url || '');
          setNotifNewProject(d.notif_new_project !== 'false');
          setNotifFollowup(d.notif_followup !== 'false');
          setNotifInspection(d.notif_inspection !== 'false');
        }
        setIntegrationLoaded(true);
        setIntegrationLoading(false);
      });
    }
  }, [activeTab, integrationLoaded]);

  useEffect(() => {
    if (activeTab === 'company' && !companyLoaded && isApiConfigured()) {
      setCompanyLoading(true);
      api.getCompanySettings().then((res) => {
        if (res.success && res.data) {
          const d = res.data as Record<string, string>;
          setCompanyName(d.company_name || '');
          setTradeName(d.trade_name || '');
          setCorporateNumber(d.corp_number || '');
          setRepresentative(d.representative || '');
          setAddress(d.address || '');
          setCompanyPhone(d.phone || '');
          setHeaderDisplay((d.header_display as 'company' | 'trade') || 'trade');
        }
        setCompanyLoaded(true);
        setCompanyLoading(false);
      });
    }
  }, [activeTab, companyLoaded]);

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

  const saveSettingField = async (key: string, value: string, label: string) => {
    const res = await api.saveCompanySettings({ [key]: value });
    if (res.success) {
      showToast(`${label}を保存しました`);
    } else {
      showToast(`${label}の保存に失敗しました`, 'error');
    }
  };

  const testGasConnection = async () => {
    setGasTestResult({ status: 'testing', message: 'テスト中...' });
    try {
      const res = await api.getCompanySettings();
      if (res.success) {
        setGasTestResult({ status: 'ok', message: '接続成功 ✓ GASと正常に通信できます' });
      } else {
        setGasTestResult({ status: 'fail', message: '接続失敗: ' + (res.error || '不明なエラー') });
      }
    } catch (err) {
      setGasTestResult({ status: 'fail', message: '接続失敗: ' + String(err) });
    }
  };

  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      showToast('会社名を入力してください', 'error');
      return;
    }
    setSubmitting(true);
    const res = await api.saveCompanySettings({
      company_name: companyName, trade_name: tradeName, corp_number: corpNumber,
      representative, address, phone: companyPhone, header_display: headerDisplay,
    });
    setSubmitting(false);
    if (res.success) {
      showToast('企業情報を保存しました');
    } else {
      showToast(String(typeof res.error === 'object' ? (res.error as Record<string, unknown>).message : res.error) || '保存に失敗しました', 'error');
    }
  };

  const headerPreviewText = headerDisplay === 'company' ? (companyName || '未登録') : (tradeName || '未登録');

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
        integrationLoading ? (
          <div className="flex items-center justify-center py-12"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>
        ) : (
        <div className="settings-grid">
          {/* LINE連携設定 */}
          <div className="detail-section">
            <h3><span className="material-icons" style={{ color: '#06C755', verticalAlign: 'middle', fontSize: 20 }}>chat</span> LINE連携設定</h3>
            <div className="detail-item">
              <label>LINE公式アカウント</label>
              <div className="line-connected">
                <span className="badge badge-green">連携済み</span>
                ラパンリフォーム 公式アカウント
              </div>
            </div>
            <div className="detail-item">
              <label>チャネルID</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">vpn_key</span>
                  <input type="text" className="form-input" placeholder="LINE Messaging APIのチャネルIDを入力" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('line_channel_id', channelId, 'LINEチャネルID')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <label>チャネルシークレット</label>
              <PasswordUrlRow icon="lock" value={channelSecret} onChange={setChannelSecret} placeholder="チャネルシークレットを入力" onSave={() => saveSettingField('line_channel_secret', channelSecret, 'LINEチャネルシークレット')} />
            </div>
            <div className="detail-item">
              <label>チャネルアクセストークン</label>
              <PasswordUrlRow icon="token" value={channelToken} onChange={setChannelToken} placeholder="チャネルアクセストークンを入力" onSave={() => saveSettingField('line_access_token', channelToken, 'LINEアクセストークン')} />
            </div>
            <div className="detail-item">
              <label>LIFF ID（モバイル版用）</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">smartphone</span>
                  <input type="text" className="form-input" placeholder="LIFF IDを入力" value={liffId} onChange={(e) => setLiffId(e.target.value)} />
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('line_liff_id', liffId, 'LIFF ID')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <label>通知設定</label>
              <div>
                <label className="toggle-label"><input type="checkbox" checked={notifNewProject} onChange={(e) => { setNotifNewProject(e.target.checked); saveSettingField('notif_new_project', String(e.target.checked), '新規案件通知'); }} /> 新規案件通知</label>
                <label className="toggle-label"><input type="checkbox" checked={notifFollowup} onChange={(e) => { setNotifFollowup(e.target.checked); saveSettingField('notif_followup', String(e.target.checked), '追客リマインド'); }} /> 追客リマインド</label>
                <label className="toggle-label"><input type="checkbox" checked={notifInspection} onChange={(e) => { setNotifInspection(e.target.checked); saveSettingField('notif_inspection', String(e.target.checked), '点検スケジュール通知'); }} /> 点検スケジュール通知</label>
              </div>
            </div>
          </div>

          {/* GAS連携 + スプレッドシート + Google Drive */}
          <div className="detail-section">
            <h3><span className="material-icons" style={{ color: '#4285f4', verticalAlign: 'middle', fontSize: 20 }}>code</span> Google Apps Script (GAS) 連携</h3>
            <div className="detail-item">
              <label>GAS WebアプリURL（API エンドポイント）</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">api</span>
                  <input type="url" className="form-input" placeholder="GASデプロイURLを入力" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} />
                  <button className="integration-url-btn" onClick={() => gasUrl && window.open(gasUrl, '_blank')} title="URLを開く"><span className="material-icons">open_in_new</span></button>
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('gas_webapp_url', gasUrl, 'GAS WebアプリURL')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
              <p className="integration-url-hint">GASをWebアプリとしてデプロイしたURLを指定してください</p>
            </div>
            <div className="detail-item">
              <label>GAS スクリプトID</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">fingerprint</span>
                  <input type="text" className="form-input" placeholder="GASプロジェクトのスクリプトIDを入力" value={gasScriptId} onChange={(e) => setGasScriptId(e.target.value)} />
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('gas_script_id', gasScriptId, 'GASスクリプトID')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <label>接続テスト</label>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={testGasConnection} style={{ fontSize: '0.8rem' }} disabled={gasTestResult.status === 'testing'}>
                  <span className="material-icons" style={{ fontSize: 16 }}>wifi_tethering</span> GAS接続テスト
                </button>
                {gasTestResult.status !== 'idle' && (
                  <span style={{ fontSize: '0.8rem' }} className={gasTestResult.status === 'ok' ? 'text-green-600' : gasTestResult.status === 'fail' ? 'text-red-600' : 'text-gray-500'}>
                    {gasTestResult.message}
                  </span>
                )}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

            <h3><span className="material-icons" style={{ color: '#0f9d58', verticalAlign: 'middle', fontSize: 20 }}>table_chart</span> スプレッドシート連携</h3>
            <div className="detail-item">
              <label>経費シート</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">link</span>
                  <input type="url" className="form-input" placeholder="スプレッドシートのURLを入力" value={sheetUrlExpense} onChange={(e) => setSheetUrlExpense(e.target.value)} />
                  <button className="integration-url-btn" onClick={() => sheetUrlExpense && window.open(sheetUrlExpense, '_blank')} title="URLを開く"><span className="material-icons">open_in_new</span></button>
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('sheet_url_expense', sheetUrlExpense, '経費シート')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <label>案件シート</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons">link</span>
                  <input type="url" className="form-input" placeholder="スプレッドシートのURLを入力" value={sheetUrlProject} onChange={(e) => setSheetUrlProject(e.target.value)} />
                  <button className="integration-url-btn" onClick={() => sheetUrlProject && window.open(sheetUrlProject, '_blank')} title="URLを開く"><span className="material-icons">open_in_new</span></button>
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('sheet_url_project', sheetUrlProject, '案件シート')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

            <h3><span className="material-icons" style={{ color: '#f59e0b', verticalAlign: 'middle', fontSize: 20 }}>cloud</span> Google Drive連携</h3>
            <div className="detail-item">
              <label>トップフォルダ</label>
              <div className="integration-url-row">
                <div className="integration-url-input">
                  <span className="material-icons" style={{ color: '#f59e0b' }}>folder</span>
                  <input type="url" className="form-input" placeholder="Google DriveフォルダのURLを入力" value={gdriveUrl} onChange={(e) => setGdriveUrl(e.target.value)} />
                  <button className="integration-url-btn" onClick={() => gdriveUrl && window.open(gdriveUrl, '_blank')} title="URLを開く"><span className="material-icons">open_in_new</span></button>
                  <button className="integration-url-btn btn-save" onClick={() => saveSettingField('gdrive_url', gdriveUrl, 'Google Driveフォルダ')} title="保存"><span className="material-icons">save</span></button>
                </div>
              </div>
              <p className="integration-url-hint">写真やドキュメントの保存先フォルダを指定してください</p>
            </div>
          </div>
        </div>
        )
      )}

      {activeTab === 'company' && (
        <div className="company-reg-card">
          <div className="company-reg-header">
            <span className="material-icons text-green-600 text-2xl">domain</span>
            <h3 className="text-lg font-bold">企業情報</h3>
          </div>
          {companyLoading ? (
            <div className="flex items-center justify-center py-12"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>
          ) : (
            <div className="company-reg-form">
              <div className="company-form-grid">
                <div className="form-group">
                  <label>会社名 <span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="例: 合同会社 中山塗装" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>屋号</label>
                  <input type="text" className="form-input" placeholder="例: ラパンリフォーム" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>法人番号</label>
                  <input type="text" className="form-input" placeholder="例: 1234567890123" maxLength={13} value={corpNumber} onChange={(e) => setCorporateNumber(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>代表者</label>
                  <input type="text" className="form-input" placeholder="例: 中山隆志" value={representative} onChange={(e) => setRepresentative(e.target.value)} />
                </div>
                <div className="form-group company-form-full">
                  <label>住所</label>
                  <input type="text" className="form-input" placeholder="例: 埼玉県狭山市南入曽580-1 ビジネススクエア入曽A" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>電話番号</label>
                  <input type="tel" className="form-input" placeholder="例: 04-2907-5022" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                </div>
              </div>

              <hr className="company-divider" />

              <div className="company-display-setting">
                <h4 className="flex items-center gap-2 font-bold text-sm mb-1">
                  <span className="material-icons text-gray-500 text-xl">tv</span>ヘッダー表示名設定
                </h4>
                <p className="text-xs text-gray-500 mb-3">画面左上のヘッダーに表示する名称を選択してください。</p>
                <div className="company-display-options">
                  <label className={`company-display-radio ${headerDisplay === 'company' ? 'selected' : ''}`}>
                    <input type="radio" name="header-display" value="company" checked={headerDisplay === 'company'} onChange={() => setHeaderDisplay('company')} />
                    <div className="company-display-radio-body">
                      <strong>会社名</strong>
                      <span>{companyName || '未登録'}</span>
                    </div>
                  </label>
                  <label className={`company-display-radio ${headerDisplay === 'trade' ? 'selected' : ''}`}>
                    <input type="radio" name="header-display" value="trade" checked={headerDisplay === 'trade'} onChange={() => setHeaderDisplay('trade')} />
                    <div className="company-display-radio-body">
                      <strong>屋号</strong>
                      <span>{tradeName || '未登録'}</span>
                    </div>
                  </label>
                </div>
                <div className="company-display-preview">
                  <span className="company-preview-label">プレビュー:</span>
                  <div className="company-preview-header">
                    <span className="material-icons text-green-600 text-xl">business</span>
                    <span className="font-bold">{headerPreviewText}</span>
                  </div>
                </div>
              </div>

              <div className="company-form-actions">
                <button className="btn-primary" onClick={handleSaveCompany} disabled={submitting}>
                  <span className="material-icons text-base">save</span>{submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}
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
