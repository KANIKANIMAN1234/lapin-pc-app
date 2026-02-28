'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { api, isApiConfigured } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: '社長',
  manager: '営業マネージャー',
  sales: '営業',
  staff: 'スタッフ',
  office: '事務',
};

type AttStatus = 'none' | 'working' | 'break' | 'left';

export default function Header() {
  const { user, logout, notifications } = useAuthStore();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [attStatus, setAttStatus] = useState<AttStatus>('none');
  const [clockInTime, setClockInTime] = useState('');
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakEndTime, setBreakEndTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [punching, setPunching] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!isApiConfigured()) return;
    api.getAttendanceStatus().then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        setAttStatus((d.status as AttStatus) || 'none');
        if (d.clock_in) setClockInTime(d.clock_in);
        if (d.break_start) setBreakStartTime(d.break_start);
        if (d.break_end) setBreakEndTime(d.break_end);
        if (d.clock_out) setClockOutTime(d.clock_out);
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); router.replace('/'); };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const punch = useCallback(async (type: string, nextStatus: AttStatus) => {
    setPunching(true);
    const payload: Record<string, unknown> = { type };

    if (type === 'clock_in' || type === 'clock_out') {
      const loc = await getLocation();
      if (loc) {
        payload.latitude = loc.latitude;
        payload.longitude = loc.longitude;
      }
    }

    const res = await api.createAttendance(payload);
    if (res.success && res.data) {
      const time = (res.data as { time?: string }).time || '';
      setAttStatus(nextStatus);
      if (type === 'clock_in') setClockInTime(time);
      if (type === 'break_start') setBreakStartTime(time);
      if (type === 'break_end') setBreakEndTime(time);
      if (type === 'clock_out') setClockOutTime(time);
    }
    setPunching(false);
  }, []);

  const statusLabel = attStatus === 'working' ? '勤務中'
    : attStatus === 'break' ? '休憩中'
    : attStatus === 'left' ? '退勤済み' : '';

  const statusColor = attStatus === 'working' ? '#06C755'
    : attStatus === 'break' ? '#f59e0b'
    : attStatus === 'left' ? '#9ca3af' : '';

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
          <button onClick={() => punch('clock_in', 'working')} disabled={punching || attStatus !== 'none'} className="att-btn att-clockin">
            <span className="material-icons">login</span>出勤
          </button>
          <button onClick={() => punch('break_start', 'break')} disabled={punching || attStatus !== 'working'} className="att-btn">
            <span className="material-icons">free_breakfast</span>休憩
          </button>
          <button onClick={() => punch('break_end', 'working')} disabled={punching || attStatus !== 'break'} className="att-btn">
            <span className="material-icons">replay</span>戻り
          </button>
          <button onClick={() => punch('clock_out', 'left')} disabled={punching || attStatus === 'none' || attStatus === 'left'} className="att-btn att-clockout">
            <span className="material-icons">logout</span>退勤
          </button>

          {statusLabel && (
            <span className="att-status-label" style={{ color: statusColor }}>
              {statusLabel}
              {clockInTime && <span className="att-time-detail"> {clockInTime}〜{clockOutTime || ''}</span>}
            </span>
          )}
        </div>

        <button onClick={() => setShowNotifications(!showNotifications)} className="header-icon-btn">
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
