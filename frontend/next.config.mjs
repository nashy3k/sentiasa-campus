/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: [
    "192.168.0.100",
    "192.168.0.100:3001",
    "192.168.0.100:3002",
    "100.72.66.116",
    "100.72.66.116:3001",
    "100.72.66.116:3002",
    "localhost:3001",
    "localhost:3002",
    "localhost:3000",
  ],
  async rewrites() {
    if (process.env.PORT === "3002" || process.env.NEXT_DIST_DIR === ".next-copilot") {
      return [
        {
          source: "/",
          destination: "/copilot",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
