import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  // typedRoutes: true,  // re-enable after all pages are scaffolded
};

export default nextConfig;
