'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'ダッシュボード' },
  { href: '/projects', icon: 'folder', label: '案件一覧' },
  { href: '/expense', icon: 'receipt_long', label: '経費登録', isNew: true },
  { href: '/followup', icon: 'follow_the_signs', label: '追客管理', isNew: true },
  { href: '/inspection', icon: 'event_note', label: '点検スケジュール', isNew: true },
  { href: '/map', icon: 'map', label: '顧客マップ' },
  { href: '/thankyou', icon: 'mail', label: 'お礼状・DM', isNew: true },
  { href: '/bonus', icon: 'payments', label: 'ボーナス計算', adminOnly: true },
  { href: '/settings', icon: 'person', label: '設定' },
  { href: '/admin', icon: 'admin_panel_settings', label: '管理', adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <aside className="sidebar-nav">
      <nav className="sidebar-nav-list">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="material-icons">{item.icon}</span>
              <span>{item.label}</span>
              {item.isNew && <span className="sidebar-nav-badge">NEW</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
