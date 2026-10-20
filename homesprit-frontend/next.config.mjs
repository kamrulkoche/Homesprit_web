/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    /* The hosts `next/image` may optimise. Listing photos are URLs an agent
       pastes, so they can come from anywhere — `ListingImage` renders any host
       NOT named here with `unoptimized`, rather than this list growing a `**`
       wildcard that would turn the optimiser into an open image proxy. */
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  async headers() {
    return [
      {
        // Belt and braces with the (admin) layout's robots metadata, as in
        // hgs-frontend: the header also covers non-HTML responses.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
