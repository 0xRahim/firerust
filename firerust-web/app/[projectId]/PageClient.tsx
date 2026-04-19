"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, Spinner, StatCard, Badge } from "@/components/ui/Primitives";
import { useApp } from "@/context/AppContext";
import { adminApi, authApi, filesApi, dbApi, formatDate } from "@/lib/api";
import { Project, AuthUser, FileRecord, Collection } from "@/lib/types";
import { getToken, getStoredUser } from "@/lib/storage";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken(projectId);
  const currentUser = getStoredUser(projectId);

  useEffect(() => {
    const run = async () => {
      try {
        const proj = await adminApi.getProject(projectId);
        setProject(proj);
        const [u, col] = await Promise.all([
          authApi.listUsers(projectId).catch(() => [] as AuthUser[]),
          token
            ? dbApi.listCollections(projectId)
                .then((r) => r.collections)
                .catch(() => [] as Collection[])
            : Promise.resolve([] as Collection[]),
        ]);
        setUsers(u);
        setCollections(col);
        if (token) {
          const f = await filesApi.list(projectId).catch(() => [] as FileRecord[]);
          setFiles(f);
        }
      } catch (e) {
        toast((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [projectId]); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const quickLinks = [
    { href: `/${projectId}/auth`, label: "Authentication", color: "bg-violet-50 text-violet-700 border-violet-200", icon: "👤", desc: "Manage users & JWTs" },
    { href: `/${projectId}/files`, label: "File Storage", color: "bg-sky-50 text-sky-700 border-sky-200", icon: "📁", desc: "Upload & manage files" },
    { href: `/${projectId}/db`, label: "Database", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🗄️", desc: "Collections & documents" },
  ];

  return (
    <>
      <Header
        title={project?.name ?? projectId}
        subtitle={project?.description ?? "Project overview"}
        actions={
          currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#a8a29e]">Logged in as</span>
              <Badge variant="success">{currentUser.email}</Badge>
            </div>
          ) : (
            <Link href={`/${projectId}/auth`}>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium cursor-pointer hover:bg-amber-100 transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Not logged in
              </div>
            </Link>
          )
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Users" value={users.length} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          } />
          <StatCard label="Files" value={token ? files.length : "—"} sub={token ? undefined : "Login to view"} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          } />
          <StatCard label="Collections" value={token ? collections.length : "—"} sub={token ? undefined : "Login to view"} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
          } />
        </div>

        {/* Quick nav cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className={`p-5 border cursor-pointer hover:shadow-md transition-all duration-200 ${l.color}`}>
                <div className="text-2xl mb-3">{l.icon}</div>
                <p className="text-sm font-semibold">{l.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{l.desc}</p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Project metadata */}
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wide mb-4">Project Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Project ID", value: project?.id, mono: true },
              { label: "Name", value: project?.name },
              { label: "Description", value: project?.description ?? "—" },
              { label: "Created", value: project ? formatDate(project.created_at) : "—" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] text-[#a8a29e] uppercase tracking-wide mb-0.5">{row.label}</p>
                <p className={`text-sm text-[#1c1917] break-all ${row.mono ? "font-mono text-xs" : ""}`}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}