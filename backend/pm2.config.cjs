module.exports = {
  apps: [{
    name: 'qzt-backend',
    script: './dist/main.js',
    // 根据环境变量决定实例数量
    instances: process.env.PM2_CLUSTER_ENABLED === 'true'
      ? 2  // 2C4G 用 2 个实例
      : 1, // 单实例模式
    exec_mode: process.env.PM2_CLUSTER_ENABLED === 'true' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 7890,
    },
    // 内存限制，超过自动重启
    max_memory_restart: '1G',
    // 日志配置
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 自动重启配置
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
  }]
}
