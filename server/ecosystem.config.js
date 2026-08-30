module.exports = {
  apps: [{
    name: 'nexchat-server',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 1000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 1000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    node_args: '--max-old-space-size=512',
    autorestart: true,
    min_uptime: 10000,
    max_restarts: 10,
    restart_delay: 4000
  }]
};
