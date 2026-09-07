module.exports = {
  apps: [
    {
      name: "mundialmegastore",
      cwd: __dirname,
      script: "pnpm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
