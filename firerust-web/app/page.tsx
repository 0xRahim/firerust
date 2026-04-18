"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button, Card, EmptyState, Spinner, StatCard } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { adminApi, formatDate } from "@/lib/api";
import { Project } from "@/lib/types";

export default function HomePage() {
  const { config, updateConfig, toast, projects, setProjects } = useApp();
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [adminKey, setAdminKey] = useState(config.adminKey);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listProjects();
      setProjects(data);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config.adminKey) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.apiUrl, config.adminKey]);

  function saveSettings() {
    updateConfig({ apiUrl: apiUrl.replace(/\/$/, ""), adminKey });
    setSettingsOpen(false);
    toast("Configuration saved", "success");
  }

  const isConfigured = !!config.adminKey;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Projects"
          subtitle={`${config.apiUrl}`}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setApiUrl(config.apiUrl);
                setAdminKey(config.adminKey);
                setSettingsOpen(true);
              }}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Settings
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Not configured banner */}
          {!isConfigured && (
            <Card className="p-6 mb-6 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800">Setup required</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Configure your Firerust API URL and admin key to get started.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => {
                      setApiUrl(config.apiUrl);
                      setAdminKey(config.adminKey);
                      setSettingsOpen(true);
                    }}
                  >
                    Configure now
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stats row */}
          {isConfigured && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard
                label="Total Projects"
                value={loading ? "…" : projects.length}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                }
              />
              <StatCard
                label="API Endpoint"
                value={config.apiUrl.replace(/^https?:\/\//, "")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                }
              />
              <StatCard
                label="Status"
                value="Live"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                sub="All systems operational"
              />
            </div>
          )}

          {/* Projects grid */}
          {isConfigured && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#1c1917]">Your Projects</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={fetchProjects} loading={loading}>
                    Refresh
                  </Button>
                  <Link href="/admin">
                    <Button size="sm" icon={
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    }>
                      New Project
                    </Button>
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner size="lg" />
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                    </svg>
                  }
                  title="No projects yet"
                  description="Create your first project to start building."
                  action={
                    <Link href="/admin">
                      <Button size="sm">Create a project</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Settings modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="API Configuration"
        description="Connect the dashboard to your running Firerust instance"
      >
        <div className="space-y-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
              API Base URL
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:4000"
              className="w-full h-9 rounded-lg border border-[#e8e2da] bg-white px-3 text-sm text-[#1c1917] placeholder-[#c4bdb7] outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
              Admin Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="your-admin-key"
              className="w-full h-9 rounded-lg border border-[#e8e2da] bg-white px-3 text-sm text-[#1c1917] placeholder-[#c4bdb7] outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
            />
            <p className="text-xs text-[#a8a29e]">Sent as X-Admin-Key header on all admin requests</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings}>Save Configuration</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/${project.id}`}>
      <Card className="p-5 hover:shadow-md hover:border-[#d6cec7] transition-all duration-200 cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f0d9c8] to-[#e8c9ae] flex items-center justify-center flex-shrink-0 group-hover:from-[#e8c9ae] group-hover:to-[#ddb898] transition-all">
            <svg className="w-4 h-4 text-[#c96a2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#1c1917] truncate group-hover:text-[#c96a2a] transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-[#a8a29e] mt-0.5 truncate">{project.description}</p>
            )}
            <p className="text-[10px] text-[#c4bdb7] mt-2 font-mono truncate">{project.id}</p>
          </div>
          <svg className="w-4 h-4 text-[#c4bdb7] group-hover:text-[#c96a2a] flex-shrink-0 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
        <div className="mt-4 pt-4 border-t border-[#f0ebe4]">
          <p className="text-[10px] text-[#c4bdb7]">Created {formatDate(project.created_at)}</p>
        </div>
      </Card>
    </Link>
  );
}