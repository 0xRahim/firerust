'use client';
import { useState, useEffect } from 'react';
import { useFirerust } from '@/context/FirerustContext';
import { firerustFetch } from '@/lib/api';

export default function Storage() {
  const { projectId, token } = useFirerust();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    if (!token || !projectId) return;
    const data = await firerustFetch(`/api/${projectId}/files`, { token });
    setFiles(data);
  };

  const onUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    
    await firerustFetch(`/api/${projectId}/files/upload`, {
      method: 'POST',
      token,
      body: fd
    });
    setUploading(false);
    fetchFiles();
  };

  useEffect(() => { fetchFiles(); }, [token, projectId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Silo Storage</h1>
        <label className="bg-zinc-100 text-black px-4 py-2 rounded-lg font-semibold cursor-pointer hover:bg-white transition">
          {uploading ? 'Processing...' : 'Upload File'}
          <input type="file" hidden onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-500">
            <tr>
              <th className="p-4">Filename</th>
              <th className="p-4">Size</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {files.map((f: any) => (
              <tr key={f.id} className="hover:bg-zinc-800/30">
                <td className="p-4 font-medium">{f.original_name}</td>
                <td className="p-4 text-zinc-500">{(f.size / 1024).toFixed(1)} KB</td>
                <td className="p-4 text-right">
                  <a 
                    href={`http://localhost:3000/api/${projectId}/files/${f.id}/download`} 
                    target="_blank"
                    className="text-orange-500 hover:text-orange-400 font-bold"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}