'use client';
import { useState, useEffect } from 'react';
import { useFirerust } from '@/context/FirerustContext';
import { firerustFetch } from '@/lib/api';

export default function DatabasePage() {
  const { projectId, token } = useFirerust();
  const [collections, setCollections] = useState([]);
  const [name, setName] = useState('');

  const createCollection = async () => {
    if (!name) return;
    await firerustFetch(`/api/${projectId}/db/collections`, {
      method: 'POST',
      token,
      body: JSON.stringify({ name, schema: {} })
    });
    setName('');
    loadCollections();
  };

  const loadCollections = async () => {
    const data = await firerustFetch(`/api/${projectId}/db/collections`, { token });
    setCollections(data.collections || []);
  };

  useEffect(() => { if (token) loadCollections(); }, [token]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Database</h1>
        <p className="text-zinc-500">Configure collections and document schemas.</p>
      </div>

      <div className="flex gap-4 mb-10">
        <input 
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
          placeholder="New collection name (e.g. 'posts')"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={createCollection} className="bg-orange-600 px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition">
          Create Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col: any) => (
          <div key={col.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition">
            <h3 className="text-lg font-bold mb-1">{col.name}</h3>
            <p className="text-xs font-mono text-zinc-500 mb-4">{col.id}</p>
            <div className="text-[10px] uppercase tracking-widest text-orange-500 font-bold">Ready</div>
          </div>
        ))}
      </div>
    </div>
  );
}