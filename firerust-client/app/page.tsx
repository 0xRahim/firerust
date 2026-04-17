'use client';
import { useFirerust } from '@/context/FirerustContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const { projectId, setProjectId, adminKey, setAdminKey } = useFirerust();
  const router = useRouter();

  const saveConfig = () => {
    localStorage.setItem('fr_pid', projectId);
    localStorage.setItem('fr_admin', adminKey);
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <div className="w-full max-w-md space-y-8 bg-zinc-900 p-8 rounded-xl border border-zinc-800">
        <h1 className="text-3xl font-bold text-orange-500">🔥 Firerust Setup</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Project ID</label>
            <input 
              className="w-full p-2 bg-zinc-800 rounded border border-zinc-700"
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="550e8400-e29b..."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Admin Key (Optional)</label>
            <input 
              type="password"
              className="w-full p-2 bg-zinc-800 rounded border border-zinc-700"
              value={adminKey} 
              onChange={(e) => setAdminKey(e.target.value)}
            />
          </div>
          <button 
            onClick={saveConfig}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded font-semibold transition"
          >
            Connect to Project
          </button>
        </div>
      </div>
    </main>
  );
}