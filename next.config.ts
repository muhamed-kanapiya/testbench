import type { NextConfig } from "next";

const staticDemo = process.env.TESTBENCH_STATIC_EXPORT === "1";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["sharp"],
  ...(staticDemo ? { output: "export", trailingSlash: true, basePath: process.env.NEXT_PUBLIC_BASE_PATH || "" } : {}),
};

export default config;
