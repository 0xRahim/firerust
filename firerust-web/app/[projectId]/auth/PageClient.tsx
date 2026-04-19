"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button, Card, EmptyState, Spinner, Badge, SectionHeader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { authApi, formatDate } from "@/lib/api";
import { AuthUser } from "@/lib/types";
import { getToken, getStoredUser, setToken, setStoredUser, clearToken } from "@/lib/storage";

type Tab = "login" | "register";

export default function AuthPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useApp();
  const [tab, setTab] = useState<Tab>("login");

  // State
  const [token, setTok] = useState<string | null>(() => getToken(projectId));
  const [me, setMe] = useState<AuthUser | null>(() => getStoredUser(projectId));
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regMeta, setRegMeta] = useState("");
  const [registering, setRegistering] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await authApi.listUsers(projectId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoadingUsers(false);
    }
  }, [projectId, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const resp = await authApi.login(projectId, { email: loginEmail, password: loginPass });
      setToken(projectId, resp.token);
      setStoredUser(projectId, resp.user);
      setTok(resp.token);
      setMe(resp.user);
      toast(`Welcome, ${resp.user.email}`, "success");
      setLoginEmail(""); setLoginPass("");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    try {
      let metadata: Record<string, unknown> | undefined;
      if (regMeta.trim()) {
        try { metadata = JSON.parse(regMeta); } catch { toast("Metadata must be valid JSON", "warning"); setRegistering(false); return; }
      }
      await authApi.register(projectId, { email: regEmail, password: regPass, metadata });
      toast(`User "${regEmail}" registered`, "success");
      setRegEmail(""); setRegPass(""); setRegMeta("");
      setTab("login");
      fetchUsers();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRegistering(false);
    }
  }

  function handleLogout() {
    clearToken(projectId);
    setTok(null);
    setMe(null);
    toast("Logged out", "info");
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteUser(projectId, deleteTarget.id);
      setUsers((u) => u.filter((x) => x.id !== deleteTarget.id));
      if (me?.id === deleteTarget.id) { clearToken(projectId); setTok(null); setMe(null); }
      toast(`User deleted`, "info");
      setDeleteTarget(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Header
        title="Authentication"
        subtitle="Per-project users with JWT tokens"
        actions={
          me ? (
            <Button variant="secondary" size="sm" onClick={handleLogout}>Sign out</Button>
          ) : undefined
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: login/register + me panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* Current user card */}
            {me && token ? (
              <Card className="p-5 border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                    {me.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 truncate">{me.email}</p>
                    <p className="text-xs text-emerald-700">Authenticated</p>
                  </div>
                  <Badge variant="success">active</Badge>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-emerald-200">
                  <div className="flex justify-between">
                    <span className="text-xs text-emerald-700">User ID</span>
                    <span className="text-xs font-mono text-emerald-800">{me.id.slice(0, 12)}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-emerald-700">Token</span>
                    <span className="text-xs font-mono text-emerald-800 truncate max-w-[140px]">{token.slice(0, 20)}…</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-[#e8e2da]">
                  {(["login", "register"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer capitalize ${
                        tab === t
                          ? "text-[#c96a2a] border-b-2 border-[#c96a2a] -mb-px bg-white"
                          : "text-[#a8a29e] hover:text-[#78716c]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {tab === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Email</label>
                        <input
                          type="email" required
                          value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Password</label>
                        <input
                          type="password" required
                          value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
                        />
                      </div>
                      <Button type="submit" className="w-full" loading={loggingIn}>Sign In</Button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Email</label>
                        <input
                          type="email" required
                          value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Password</label>
                        <input
                          type="password" required
                          value={regPass} onChange={(e) => setRegPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
                          Metadata <span className="normal-case text-[#a8a29e]">(JSON, optional)</span>
                        </label>
                        <textarea
                          value={regMeta} onChange={(e) => setRegMeta(e.target.value)}
                          placeholder='{"display_name": "Alice"}'
                          rows={3}
                          className="w-full rounded-lg border border-[#e8e2da] px-3 py-2 text-sm font-mono outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15 resize-none"
                        />
                      </div>
                      <Button type="submit" className="w-full" loading={registering}>Create Account</Button>
                    </form>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right: users table */}
          <div className="lg:col-span-3">
            <SectionHeader
              title="Project Users"
              description="All registered users in this project"
              action={
                <Button variant="ghost" size="sm" onClick={fetchUsers} loading={loadingUsers}>
                  Refresh
                </Button>
              }
            />
            <Card className="overflow-hidden">
              {loadingUsers ? (
                <div className="flex justify-center py-12"><Spinner size="md" /></div>
              ) : users.length === 0 ? (
                <EmptyState
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>}
                  title="No users yet"
                  description="Register the first user using the form."
                />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e2da] bg-[#faf7f4]">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#a8a29e] uppercase tracking-wide">User</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#a8a29e] uppercase tracking-wide hidden md:table-cell">ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#a8a29e] uppercase tracking-wide hidden lg:table-cell">Joined</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe4]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#fdfcfb] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#f0d9c8] flex items-center justify-center text-[#c96a2a] text-xs font-semibold flex-shrink-0">
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-[#1c1917]">{u.email}</p>
                              {me?.id === u.id && <Badge variant="success">you</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs font-mono text-[#a8a29e]">{u.id.slice(0, 14)}…</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-[#a8a29e]">{formatDate(u.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(u)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Delete "${deleteTarget?.email}"? They will be unable to log in.`}
        loading={deleting}
      />
    </>
  );
}