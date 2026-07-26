/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy vers l'API de lecture (config-driven via API_URL).
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};
module.exports = nextConfig;
