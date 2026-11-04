import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["sharp"],
};

export default config;
