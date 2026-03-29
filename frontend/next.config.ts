import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Die IP ohne Port UND mit Port hinzufügen */
  allowedDevOrigins: ["192.168.2.118", "192.168.2.118:3000"],
};

export default nextConfig;
