"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button, Card, EmptyState, Spinner, Badge, SectionHeader } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { filesApi, formatBytes, formatDate, isImageType } from "@/lib/api";
import { FileRecord } from "@/lib/types";
import { getToken } from "@/lib/storage";
import Link from "next/link";

export default function FilesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useApp();
  const token = getToken(projectId);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setFiles(await filesApi.list(projectId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [projectId, token, toast]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function uploadFile(file: File) {
    if (!token) { toast("Login first in the Auth tab", "warning"); return; }
    setUploading(true);
    try {
      const rec = await filesApi.upload(projectId, file);
      setFiles((prev) => [rec, ...prev]);
      toast(`"${file.name}" uploaded`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await filesApi.delete(projectId, deleteTarget.id);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast("File deleted", "info");
      setDeleteTarget(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  }

  // Totals
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const imageCount = files.filter((f) => isImageType(f.content_type)).length;

  return (
    <>
      <Header
        title="File Storage"
        subtitle="Upload, manage, and serve files"
        actions={
          token ? (
            <Button
              size="sm"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              }
            >
              Upload File
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
                  You must be logged in to upload or view files.{" "}
                  <Link href={`/${projectId}/auth`} className="underline font-medium">
                    Sign in here →
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Files", value: files.length },
                { label: "Total Size", value: formatBytes(totalSize) },
                { label: "Images", value: imageCount },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-xs font-medium text-[#a8a29e] uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-semibold text-[#1c1917] font-mono mt-1">{s.value}</p>
                </Card>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-[#c96a2a] bg-[#fdf5ef]"
                  : "border-[#e8e2da] bg-white hover:border-[#c96a2a]/50 hover:bg-[#fdfcfb]"
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="lg" />
                  <p className="text-sm text-[#a8a29e]">Uploading…</p>
                </div>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${dragOver ? "bg-[#f0d9c8] text-[#c96a2a]" : "bg-[#f5f0eb] text-[#c4bdb7]"}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#57534e]">
                    {dragOver ? "Drop to upload" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-[#a8a29e] mt-0.5">Any file type supported</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInput}
            />

            {/* Files list */}
            <SectionHeader
              title="Uploaded Files"
              description={`${files.length} file${files.length !== 1 ? "s" : ""} in this project`}
              action={
                <Button variant="ghost" size="sm" onClick={fetchFiles} loading={loading}>
                  Refresh
                </Button>
              }
            />

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : files.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                }
                title="No files yet"
                description="Upload a file using the dropzone above."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {files.map((f) => (
                  <FileCard
                    key={f.id}
                    file={f}
                    projectId={projectId}
                    onPreview={() => setPreviewFile(f)}
                    onDelete={() => setDeleteTarget(f)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Preview modal */}
      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.original_name ?? "File"}
        description={previewFile ? `${formatBytes(previewFile.size)} · ${previewFile.content_type}` : undefined}
        maxWidth="max-w-2xl"
      >
        {previewFile && (
          <div className="mt-2 space-y-4">
            {isImageType(previewFile.content_type) && (
              <div className="rounded-lg overflow-hidden bg-[#f5f0eb] border border-[#e8e2da] flex items-center justify-center min-h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filesApi.downloadUrl(projectId, previewFile.id)}
                  alt={previewFile.original_name}
                  className="max-w-full max-h-80 object-contain"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "File ID", value: previewFile.id, mono: true },
                { label: "Original name", value: previewFile.original_name },
                { label: "Content type", value: previewFile.content_type, mono: true },
                { label: "Size", value: formatBytes(previewFile.size) },
                { label: "Uploaded", value: formatDate(previewFile.created_at) },
                { label: "Stored as", value: previewFile.filename, mono: true },
              ].map((row) => (
                <div key={row.label} className="bg-[#faf7f4] rounded-lg p-3">
                  <p className="text-[10px] text-[#a8a29e] uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className={`text-xs text-[#1c1917] break-all ${row.mono ? "font-mono" : ""}`}>{row.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <a
                href={filesApi.downloadUrl(projectId, previewFile.id)}
                download={previewFile.original_name}
                target="_blank"
                rel="noreferrer"
              >
                <Button icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                }>
                  Download
                </Button>
              </a>
              <Button variant="secondary" onClick={() => {
                navigator.clipboard.writeText(filesApi.downloadUrl(projectId, previewFile.id));
                toast("Download URL copied", "success");
              }}>
                Copy URL
              </Button>
              <Button variant="danger" className="ml-auto" onClick={() => {
                setDeleteTarget(previewFile);
                setPreviewFile(null);
              }}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Permanently delete "${deleteTarget?.original_name}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}

// ─── File card component ───────────────────────────────────────────────────────

function FileCard({
  file,
  projectId,
  onPreview,
  onDelete,
}: {
  file: FileRecord;
  projectId: string;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const isImage = isImageType(file.content_type);
  const ext = file.original_name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <Card className="overflow-hidden group hover:shadow-md hover:border-[#d6cec7] transition-all duration-200">
      {/* Thumbnail */}
      <div
        className="h-36 bg-[#f5f0eb] flex items-center justify-center cursor-pointer relative overflow-hidden"
        onClick={onPreview}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={filesApi.downloadUrl(projectId, file.id)}
            alt={file.original_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <FileIcon contentType={file.content_type} />
            <Badge>{ext}</Badge>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 rounded-lg px-3 py-1.5 text-xs font-medium text-[#1c1917] shadow">
            Preview
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-sm font-medium text-[#1c1917] truncate" title={file.original_name}>
          {file.original_name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[#a8a29e]">{formatBytes(file.size)}</span>
          <span className="text-xs text-[#a8a29e]">{formatDate(file.created_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#f0ebe4]">
          <a
            href={filesApi.downloadUrl(projectId, file.id)}
            download={file.original_name}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full">
              Download
            </Button>
          </a>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FileIcon({ contentType }: { contentType: string }) {
  const color = contentType.startsWith("video/")
    ? "text-violet-400"
    : contentType.startsWith("audio/")
    ? "text-pink-400"
    : contentType.includes("pdf")
    ? "text-red-400"
    : contentType.includes("zip") || contentType.includes("tar")
    ? "text-amber-400"
    : "text-[#c4bdb7]";

  return (
    <svg className={`w-10 h-10 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}