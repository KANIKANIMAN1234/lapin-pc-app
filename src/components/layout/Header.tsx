'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: '社長',
  manager: '営業マネージャー',
  sales: '営業',
  staff: 'スタッフ',
  office: '事務',
};

export default function Header() {
  const { user, logout, notifications } = useAuthStore();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [attendance, setAttendance] = useState<'none' | 'working' | 'break'>('none');
  const [attStatus, setAttStatus] = useState('');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleClockIn = async () => {
    setAttendance('working');
    const now = new Date();
    setAttStatus(`出勤 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    try { await api.createAttendance({ type: 'clock_in' }); } catch { /* noop */ }
  };
  const handleBreakStart = async () => {
    setAttendance('break');
    setAttStatus('休憩中');
    try { await api.createAttendance({ type: 'break_start' }); } catch { /* noop */ }
  };
  const handleBreakEnd = async () => {
    setAttendance('working');
    setAttStatus('勤務中');
    try { await api.createAttendance({ type: 'break_end' }); } catch { /* noop */ }
  };
  const handleClockOut = async () => {
    setAttendance('none');
    setAttStatus('退勤済み');
    try { await api.createAttendance({ type: 'clock_out' }); } catch { /* noop */ }
  };

  return (
    <header className="header-bar">
      <div className="header-bar-left">
        <span className="material-icons header-logo-icon">business</span>
        <div>
          <h1 className="header-brand-title">ラパンリフォーム</h1>
          <span className="header-brand-sub">LINE公式アカウント連携</span>
        </div>
      </div>

      <div className="header-bar-right">
        <div className="header-attendance-group">
          <button
            onClick={handleClockIn}
            disabled={attendance !== 'none'}
            className="att-btn att-clockin"
          >
            <span className="material-icons">login</span>出勤
          </button>
          <button
            onClick={handleBreakStart}
            disabled={attendance !== 'working'}
            className="att-btn"
          >
            <span className="material-icons">free_breakfast</span>休憩
          </button>
          <button
            onClick={handleBreakEnd}
            disabled={attendance !== 'break'}
            className="att-btn"
          >
            <span className="material-icons">replay</span>戻り
          </button>
          <button
            onClick={handleClockOut}
            disabled={attendance === 'none'}
            className="att-btn att-clockout"
          >
            <span className="material-icons">logout</span>退勤
          </button>
          {attStatus && <span className="att-status-label">{attStatus}</span>}
        </div>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="header-icon-btn"
        >
          <span className="material-icons">notifications</span>
          {unreadCount > 0 && <span className="header-notif-badge">{unreadCount}</span>}
        </button>

        <div className="header-user-menu">
          <span className="header-user-name">{user?.name}</span>
          <span className="header-user-role">{user?.role ? ROLE_LABELS[user.role] || user.role : ''}</span>
          <button onClick={handleLogout} className="header-icon-btn" title="ログアウト">
            <span className="material-icons">logout</span>
          </button>
        </div>
      </div>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="notification-panel open">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">通知</h3>
              <button onClick={() => setShowNotifications(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="divide-y">
              {notifications.length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">通知はありません</div>
              )}
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 flex gap-3 ${!n.read ? 'bg-blue-50' : ''}`}>
                  <span className="material-icons text-gray-400 shrink-0">
                    {n.type === 'line_message' ? 'chat' : n.type === 'project' ? 'folder' : n.type === 'inspection' ? 'event' : n.type === 'followup' ? 'warning' : 'photo'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
