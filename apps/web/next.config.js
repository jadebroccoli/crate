/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['@crate/shared'],
};

module.exports = nextConfig;
