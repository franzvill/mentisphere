import type { NextConfig } from 'next';

// Local-dev convenience: when MEDIAWIKI_PROXY_URL is set, rewrite MediaWiki
// paths to that backend so the wiki and chat-service share an origin
// (otherwise the browser won't send the MW session cookie to /api/chat).
// Set MEDIAWIKI_PROXY_URL=http://localhost:8081 in chat-service/.env.local
// when developing locally with the docker MW exposed on a different port.
const mwProxy = process.env.MEDIAWIKI_PROXY_URL;

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    if (!mwProxy) return [];
    return [
      // MW page URLs and entry points
      { source: '/wiki/:path*', destination: `${mwProxy}/wiki/:path*` },
      { source: '/index.php', destination: `${mwProxy}/index.php` },
      { source: '/index.php/:path*', destination: `${mwProxy}/index.php/:path*` },
      { source: '/api.php', destination: `${mwProxy}/api.php` },
      { source: '/api.php/:path*', destination: `${mwProxy}/api.php/:path*` },
      { source: '/load.php', destination: `${mwProxy}/load.php` },
      { source: '/load.php/:path*', destination: `${mwProxy}/load.php/:path*` },
      { source: '/rest.php/:path*', destination: `${mwProxy}/rest.php/:path*` },
      // MW assets
      { source: '/skins/:path*', destination: `${mwProxy}/skins/:path*` },
      { source: '/resources/:path*', destination: `${mwProxy}/resources/:path*` },
      { source: '/images/:path*', destination: `${mwProxy}/images/:path*` },
      { source: '/extensions/:path*', destination: `${mwProxy}/extensions/:path*` },
    ];
  },
};

export default nextConfig;
