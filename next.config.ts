import type { NextConfig } from "next";

const config: NextConfig = {
  // These packages load their own files from disk, so they must not be bundled.
  serverExternalPackages: ["sql.js", "pdf-parse", "mammoth"],
  devIndicators: false,
};

export default config;
