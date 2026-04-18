"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  Button, Card, EmptyState, Spinner, SectionHeader
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { adminApi, formatDate } from "@/lib/api";
import { Project } from "@/lib/types";
import Link from "next/link";

export default function AdminPage() {
  const { toast, projects, setProjects } = useApp();
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      setProjects(await adminApi.listProjects());
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []); // eslint-disable-line

  async function createProject() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const p = await adminApi.createProject({ name: name.trim(), description: desc || undefined });
      setProjects([p, ...projects]);
      setCreateOpen(false);
      setName(""); setDesc("");
      toast(`Project "${p.name}" created`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteProject(deleteTarget.id);
      setProjects(projects.filter((p) => p.id !== deleteTarget.id));
      toast(`Project "${deleteTarget.name}" deleted`, "info");
      setDeleteTarget(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Admin"
          subtitle="Manage projects and global configuration"
          actions={
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              New Project
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <SectionHeader
            title="Projects"
            description="Each project is an isolated namespace with its own users, files, and collections."
            action={
              <Button variant="ghost" size="sm" onClick={fetchProjects} loading={loading}>
                Refresh
              </Button>
            }
          />

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              }
              title="No projects"
              description="Create your first project to start using Firerust."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create Project</Button>}
            />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e2da] bg-[#faf7f4]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#a8a29e] uppercase tracking-wide">Project</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#a8a29e] uppercase tracking-wide hidden md:table-cell">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#a8a29e] uppercase tracking-wide hidden lg:table-cell">Created</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe4]">
                  {projects.map((p) => (
                    <tr key={p.id} className="group hover:bg-[#fdfcfb] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-[#fdf5ef] flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-[#c96a2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1c1917]">{p.name}</p>
                            {p.description && <p className="text-xs text-[#a8a29e]">{p.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs font-mono text-[#a8a29e]">{p.id.slice(0, 16)}…</span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-[#a8a29e]">{formatDate(p.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/${p.id}`}>
                            <Button variant="ghost" size="sm">Open</Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </main>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setName(""); setDesc(""); }}
        title="Create Project"
        description="Projects are isolated namespaces for auth, files, and database."
      >
        <div className="space-y-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="my-app"
              className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setName(""); setDesc(""); }}>
              Cancel
            </Button>
            <Button onClick={createProject} loading={creating} disabled={!name.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProject}
        title="Delete Project"
        message={`Permanently delete "${deleteTarget?.name}"? All users, files, and collections will be removed. This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}