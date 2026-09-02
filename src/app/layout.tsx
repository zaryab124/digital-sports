import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Sports Community | South Punjab Multi-City Sports Platform',
  description: 'Official digital sports platform for Jampur, DG Khan, Rajanpur, Multan, Taunsa, Muzaffargarh, and Layyah. Real scorebooks, player transfers, tournaments, and rankings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-slate-900 border-t border-slate-800 py-8 text-center text-xs text-slate-500">
          <p>© 2026 Sports Community Platform. Built for South Punjab Regional Sports Network.</p>
          <p className="mt-1">Jampur • Dera Ghazi Khan • Rajanpur • Taunsa • Multan • Muzaffargarh • Layyah</p>
        </footer>
      </body>
    </html>
  );
}
