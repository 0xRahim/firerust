/**
 * Server Component — no "use client" here.
 *
 * generateStaticParams tells Next.js which [projectId] values to pre-render.
 * We return a single dummy value ("x") so Next.js produces the HTML shell.
 * The real project IDs are runtime SQLite values; the Rust binary's SPA
 * fallback returns the root index.html for any unrecognised path, then the
 * Next.js client-side router renders the correct component with useParams().
 */
import LayoutClient from "./LayoutClient";

export function generateStaticParams() {
  return [{ projectId: "x" }];
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutClient>{children}</LayoutClient>;
}