import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "bullmq", "ioredis"],
};

export default nextConfig;
