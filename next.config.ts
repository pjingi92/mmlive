import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/send-estimate": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/send-statement": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;