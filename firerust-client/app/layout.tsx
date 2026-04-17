import './globals.css';
import { FirerustProvider } from '@/context/FirerustContext';

export const metadata = {
  title: 'Firerust Dashboard',
  description: 'Self-hosted BaaS Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <FirerustProvider>
          {children}
        </FirerustProvider>
      </body>
    </html>
  );
}