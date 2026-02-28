'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  admin: '社長',
  manager: '営業マネージャー',
  sales: '営業',
  office: '事務',
};

export default function Header() {
  const { user, logout, notifications } = useAuthStore();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [attendance, setAttendance] = useState<'none' | 'working' | 'break'>('none');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    router.replace('/');
  };
  const handleClockIn = () => setAttendance('working');
  const handleBreakStart = () => setAttendance('break');
  const handleBreakEnd = () => setAttendance('working');
  const handleClockOut = () => setAttendance('none');

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="material-icons text-green-500 text-3xl">business</span>
        <div>
          <h1 className="text-sm font-bold leading-tight">ラパンリフォーム</h1>
          <span className="text-[10px] text-gray-400">LINE公式アカウント連携</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Attendance */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={handleClockIn}
            disabled={attendance !== 'none'}
            className="att-btn text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1 disabled:opacity-40"
          >
            <span className="material-icons text-sm">login</span>出勤
          </button>
          <button
            onClick={handleBreakStart}
            disabled={attendance !== 'working'}
            className="att-btn text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1 disabled:opacity-40"
          >
            <span className="material-icons text-sm">free_breakfast</span>休憩
          </button>
          <button
            onClick={handleBreakEnd}
            disabled={attendance !== 'break'}
            className="att-btn text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1 disabled:opacity-40"
          >
            <span className="material-icons text-sm">replay</span>戻り
          </button>
          <button
            onClick={handleClockOut}
            disabled={attendance === 'none'}
            className="att-btn text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1 disabled:opacity-40"
          >
            <span className="material-icons text-sm">logout</span>退勤
          </button>
        </div>
        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 hover:bg-gray-100 rounded-full"
        >
          <span className="material-icons">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {/* User */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm font-medium">{user?.name}</span>
          <span className="text-xs text-gray-500">
            {user?.role ? ROLE_LABELS[user.role] : ''}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="ログアウト"
          >
            <span className="material-icons text-gray-500">logout</span>
          </button>
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">通知</h3>
              <button onClick={() => setShowNotifications(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex gap-3 ${!n.read ? 'bg-blue-50' : ''}`}
                >
                  <span className="material-icons text-gray-400 shrink-0">
                    {n.type === 'line_message'
                      ? 'chat'
                      : n.type === 'project'
                        ? 'folder'
                        : n.type === 'inspection'
                          ? 'event'
                          : n.type === 'followup'
                            ? 'warning'
                            : 'photo'}
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
