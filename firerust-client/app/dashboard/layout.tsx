'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { label: 'Overview', href: '/dashboard', icon: '🏠' },
    { label: 'Authentication', href: '/dashboard/auth', icon: '👤' },
    { label: 'Database', href: '/dashboard/database', icon: '📦' },
    { label: 'Storage', href: '/dashboard/storage', icon: '📁' },
  ];

  return (
    <div className="flex h-screen bg-black">
      <aside className="w-64 border-r border-zinc-800 flex flex-col p-4 bg-zinc-950">
        <div className="flex items-center gap-3 px-2 mb-10">
          <span className="text-orange-500 text-xl font-bold">Firerust</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(item => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-10">
        {children}
      </main>
    </div>
  );
}