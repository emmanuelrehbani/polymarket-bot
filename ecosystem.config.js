module.exports = {
  apps: [
    {
      name: "polymarket-bot",
      script: "dist/index.js",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 30000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
