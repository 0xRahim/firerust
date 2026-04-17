'use client';
import { useState, useEffect } from 'react';
import { useFirerust } from '@/context/FirerustContext';
import { firerustFetch } from '@/lib/api';

export default function Overview() {
  const { adminKey, updateProjectId, projectId } = useFirerust();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');

  const load = async () => {
    if (!adminKey) return;
    try {
      const data = await firerustFetch('/admin/projects', { adminKey });
      setProjects(data);
    } catch (e) { console.error(e); }
  };

  const create = async () => {
    await firerustFetch('/admin/projects', {
      method: 'POST',
      adminKey,
      body: JSON.stringify({ name })
    });
    setName('');
    load();
  };

  useEffect(() => { load(); }, [adminKey]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-zinc-400">Manage your Firerust namespaces.</p>
      </header>

      <div className="flex gap-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <input 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2"
          placeholder="New Project Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={create} className="bg-orange-600 px-6 py-2 rounded-lg font-bold hover:bg-orange-500 transition">
          Create
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p: any) => (
          <div key={p.id} className={`p-6 rounded-xl border ${projectId === p.id ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/30'}`}>
            <h3 className="text-xl font-bold mb-1">{p.name}</h3>
            <code className="text-[10px] text-zinc-500 block mb-4">{p.id}</code>
            <button 
              onClick={() => updateProjectId(p.id)}
              className="text-xs font-bold text-orange-500 uppercase tracking-widest hover:underline"
            >
              {projectId === p.id ? 'Current Active' : 'Select Project'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}