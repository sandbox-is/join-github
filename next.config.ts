import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local database finds its own files at run time, which bundling breaks.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
