'use client';
import { useState, useEffect } from 'react';
import { useFirerust } from '@/context/FirerustContext';
import { firerustFetch } from '@/lib/api';

export default function AuthRegistry() {
  const { projectId, adminKey, setToken } = useFirerust();
  const [users, setUsers] = useState([]);
  const [authData, setAuthData] = useState({ email: '', password: '' });

  const login = async () => {
    const data = await firerustFetch(`/api/${projectId}/auth/login`, { //
      method: 'POST',
      body: JSON.stringify(authData)
    });
    setToken(data.token); //
    localStorage.setItem('fr_token', data.token);
    alert("JWT_ACQUIRED");
  };

  const loadUsers = async () => {
    const data = await firerustFetch(`/api/${projectId}/auth/users`, { adminKey }); //
    setUsers(data);
  };

  useEffect(() => { if (adminKey && projectId) loadUsers(); }, [adminKey, projectId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="retro-card lg:col-span-1 h-fit">
        <h2 className="text-xl font-black mb-6 uppercase italic underline">Access_Gateway</h2>
        <div className="space-y-4 font-mono text-sm">
          <input 
            className="w-full bg-zinc-900 border-b-2 border-orange-500 p-2" 
            placeholder="EMAIL_ADDR" 
            onChange={e => setAuthData({...authData, email: e.target.value})}
          />
          <input 
            type="password"
            className="w-full bg-zinc-900 border-b-2 border-orange-500 p-2" 
            placeholder="PASS_TOKEN" 
            onChange={e => setAuthData({...authData, password: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button onClick={login} className="retro-btn text-xs">Login</button>
            <button className="retro-btn bg-white text-black text-xs">Register</button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-black uppercase tracking-widest">Active_User_Records</h2>
        <div className="bg-zinc-900 border-4 border-orange-500">
          <table className="w-full text-left font-mono text-[10px]">
            <thead className="bg-orange-500 text-black">
              <tr>
                <th className="p-2">UID</th>
                <th className="p-2">IDENTITY</th>
                <th className="p-2">STAMP</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800">
                  <td className="p-2 opacity-50">{u.id.slice(0,8)}...</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}