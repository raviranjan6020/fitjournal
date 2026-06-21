import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
