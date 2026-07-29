import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal self-contained build in .next/standalone
  output: "standalone",

  // Disable the Next.js X-Powered-By header
  poweredByHeader: false,
};

export default nextConfig;
