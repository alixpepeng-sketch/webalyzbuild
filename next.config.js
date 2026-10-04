/** @type {import('next').NextConfig} */
// Variabel di bawah ini di-inline ke bundle browser saat build,
// karena push ke GitHub dilakukan langsung dari frontend.
const nextConfig = {
  reactStrictMode: true,
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    REPO_OWNER: process.env.REPO_OWNER || '',
    REPO_NAME: process.env.REPO_NAME || '',
    REPO_BRANCH: process.env.REPO_BRANCH || 'main',
  },
};
module.exports = nextConfig;
