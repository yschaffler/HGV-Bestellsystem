import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable in dev to avoid caching loops
  register: true,
});

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  /* Die IP ohne Port UND mit Port hinzufügen */
  allowedDevOrigins: ["192.168.2.108", "192.168.2.108:3000"],
  turbopack: {}, // Silences the Turbopack warning caused by next-pwa injecting webpack config
};

export default withPWA(nextConfig);
