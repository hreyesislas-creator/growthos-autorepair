/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eetirez.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  // Clean URLs
  trailingSlash: false,
}

module.exports = nextConfig
