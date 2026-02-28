import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ラパンリフォーム 業務管理システム',
  description: 'LINE公式アカウント連携 業務管理システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
