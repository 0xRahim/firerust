import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",       // emit static files into out/
  trailingSlash: true,    // /auth → /auth/index.html (needed for Rust SPA fallback)
  images: { unoptimized: true },
};

export default nextConfig;