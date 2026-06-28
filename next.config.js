/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
    responseLimit: '10mb',
  },
};
module.exports = nextConfig;
