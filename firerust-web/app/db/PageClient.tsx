"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import {
  Button, Card, EmptyState, Spinner, Badge, SectionHeader, Code,
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { dbApi, formatDate } from "@/lib/api";
import { Collection } from "@/lib/types";
import { getToken } from "@/lib/storage";
import Link from "next/link";

export default function DbPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useApp();
  const token = getToken(projectId);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedColl, setSelectedColl] = useState<Collection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [collName, setCollName] = useState("");
  const [schemaStr, setSchemaStr] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp = await dbApi.listCollections(projectId);
      setCollections(resp.collections);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [projectId, token, toast]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!collName.trim()) return;
    let schema: Record<string, unknown> | undefined;
    if (schemaStr.trim()) {
      try { schema = JSON.parse(schemaStr); }
      catch { toast("Schema must be valid JSON", "warning"); return; }
    }
    setCreating(true);
    try {
      const coll = await dbApi.createCollection(projectId, {
        name: collName.trim(),
        schema,
      });
      setCollections((prev) => [...prev, coll as unknown as Collection]);
      toast(`Collection "${collName}" created`, "success");
      setCreateOpen(false);
      setCollName(""); setSchemaStr("");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Header
        title="Database"
        subtitle="Collections and document storage"
        actions={
          token ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              New Collection
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        {!token ? (
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Authentication required</p>
                <p className="text-sm text-amber-700">
                  Sign in to manage database collections.{" "}
                  <Link href={`/${projectId}/auth`} className="underline font-medium">
                    Sign in here →
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: collections list */}
            <div className="lg:col-span-1">
              <SectionHeader
                title="Collections"
                description={`${collections.length} collection${collections.length !== 1 ? "s" : ""}`}
                action={
                  <Button variant="ghost" size="sm" onClick={fetchCollections} loading={loading}>
                    Refresh
                  </Button>
                }
              />

              {loading ? (
                <div className="flex justify-center py-12"><Spinner size="md" /></div>
              ) : collections.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  }
                  title="No collections"
                  description="Create your first collection to start storing documents."
                  action={
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      Create Collection
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColl(c)}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                        selectedColl?.id === c.id
                          ? "border-[#c96a2a] bg-[#fdf5ef] shadow-sm"
                          : "border-[#e8e2da] bg-white hover:border-[#d6cec7] hover:bg-[#fdfcfb]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedColl?.id === c.id ? "bg-[#f0d9c8] text-[#c96a2a]" : "bg-[#f5f0eb] text-[#c4bdb7]"
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            selectedColl?.id === c.id ? "text-[#c96a2a]" : "text-[#1c1917]"
                          }`}>
                            {c.name}
                          </p>
                          <p className="text-[10px] text-[#a8a29e] mt-0.5">{formatDate(c.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: collection detail */}
            <div className="lg:col-span-2">
              {selectedColl ? (
                <CollectionDetail collection={selectedColl} projectId={projectId} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-2xl bg-[#f5f0eb] flex items-center justify-center text-[#c4bdb7] mx-auto mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#78716c]">Select a collection</p>
                    <p className="text-xs text-[#a8a29e] mt-1">Choose from the list to inspect it</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create collection modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCollName(""); setSchemaStr(""); }}
        title="Create Collection"
        description="Define a named collection and optional document schema"
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">Name *</label>
            <input
              autoFocus required
              value={collName}
              onChange={(e) => setCollName(e.target.value)}
              placeholder="todos"
              className="w-full h-9 rounded-lg border border-[#e8e2da] px-3 text-sm outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#57534e] uppercase tracking-wide">
              Schema <span className="normal-case text-[#a8a29e] font-normal">(JSON, optional)</span>
            </label>
            <textarea
              value={schemaStr}
              onChange={(e) => setSchemaStr(e.target.value)}
              placeholder={'{\n  "title": { "type": "string" },\n  "done":  { "type": "boolean" }\n}'}
              rows={5}
              className="w-full rounded-lg border border-[#e8e2da] px-3 py-2 text-sm font-mono outline-none focus:border-[#c96a2a] focus:ring-2 focus:ring-[#c96a2a]/15 resize-none"
            />
            <p className="text-xs text-[#a8a29e]">
              Informational only — used for reference, not enforced yet.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setCreateOpen(false); setCollName(""); setSchemaStr(""); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!collName.trim()}>
              Create Collection
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Collection detail panel ───────────────────────────────────────────────────

function CollectionDetail({
  collection,
  projectId,
}: {
  collection: Collection;
  projectId: string;
}) {
  const { toast } = useApp();
  const token = getToken(projectId);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docNote, setDocNote] = useState<string | null>(null);

  async function fetchDocs() {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const resp = await dbApi.listDocuments(projectId, collection.id);
      setDocNote(resp.note);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => { fetchDocs(); }, [collection.id]); // eslint-disable-line

  const hasSchema = collection.schema && Object.keys(collection.schema).length > 0;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#fdf5ef] flex items-center justify-center text-[#c96a2a]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1c1917]">{collection.name}</h3>
            <p className="text-xs text-[#a8a29e]">Created {formatDate(collection.created_at)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#faf7f4] rounded-lg p-3">
            <p className="text-[10px] text-[#a8a29e] uppercase tracking-wide mb-1">Collection ID</p>
            <p className="text-xs font-mono text-[#1c1917] break-all">{collection.id}</p>
          </div>
          <div className="bg-[#faf7f4] rounded-lg p-3">
            <p className="text-[10px] text-[#a8a29e] uppercase tracking-wide mb-1">Endpoint</p>
            <p className="text-xs font-mono text-[#1c1917] break-all">
              /api/{projectId.slice(0, 8)}…/db/collections/{collection.id.slice(0, 8)}…/documents
            </p>
          </div>
        </div>
      </Card>

      {/* Schema card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">Schema</h4>
          {hasSchema ? <Badge variant="success">defined</Badge> : <Badge variant="default">none</Badge>}
        </div>
        {hasSchema ? (
          <pre className="bg-[#1c1917] text-[#e8c9ae] rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            {JSON.stringify(collection.schema, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-[#a8a29e]">
            No schema defined. All document shapes are accepted.
          </p>
        )}
      </Card>

      {/* Documents card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">Documents</h4>
          <Button variant="ghost" size="sm" onClick={fetchDocs} loading={loadingDocs}>
            Refresh
          </Button>
        </div>

        {/* Coming soon notice */}
        <div className="rounded-xl border border-dashed border-[#e8e2da] bg-[#faf7f4] p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#f0d9c8] flex items-center justify-center mx-auto mb-3 text-[#c96a2a]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#57534e] mb-1">Document CRUD coming soon</p>
          {docNote && (
            <p className="text-xs text-[#a8a29e]">{docNote}</p>
          )}
          <div className="mt-4 space-y-1.5 text-left max-w-xs mx-auto">
            <p className="text-xs font-medium text-[#78716c] mb-2">Planned API endpoints:</p>
            {[
              ["GET", `…/${collection.id.slice(0,8)}…/documents`],
              ["POST", `…/${collection.id.slice(0,8)}…/documents`],
              ["GET", `…/${collection.id.slice(0,8)}…/documents/:id`],
              ["PUT", `…/${collection.id.slice(0,8)}…/documents/:id`],
              ["DELETE", `…/${collection.id.slice(0,8)}…/documents/:id`],
            ].map(([method, path]) => (
              <div key={method + path} className="flex items-center gap-2">
                <Badge variant={method === "GET" ? "info" : method === "POST" ? "success" : method === "DELETE" ? "danger" : "warning"}>
                  {method}
                </Badge>
                <Code>{path}</Code>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}