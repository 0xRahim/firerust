import PageClient from "./PageClient";

export function generateStaticParams() {
  return [{ projectId: "x" }];
}

export default function ProjectPage() {
  return <PageClient />;
}