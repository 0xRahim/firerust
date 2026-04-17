'use client';
import { useEffect, useState } from 'react';
import { useFirerust } from '@/context/FirerustContext';
import { firerustFetch } from '@/lib/api';

export default function FilePage() {
  const { projectId, token } = useFirerust();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = async () => {
    try {
      const data = await firerustFetch(`/api/${projectId}/files`, { token });
      setFiles(data);
    } catch (e) { console.error(e); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      await fetch(`http://localhost:3000/api/${projectId}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      loadFiles();
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => { if (token) loadFiles(); }, [token]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Files</h2>
        <input type="file" onChange={handleUpload} disabled={uploading} className="text-sm border p-1 rounded cursor-pointer" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {files.map((file: any) => (
          <div key={file.id} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="font-mono text-xs text-zinc-500 mb-2 truncate">{file.id}</p>
            <p className="font-bold truncate">{file.original_name}</p>
            <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(2)} KB</p>
            <div className="mt-4 flex gap-2">
              <a 
                href={`http://localhost:3000/api/${projectId}/files/${file.id}/download`}
                target="_blank"
                className="text-xs bg-blue-600 px-2 py-1 rounded"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}