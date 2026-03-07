// ============================================================
// PM2 配置 - 企智通 Backend (NestJS)
// ============================================================
// 适配 ECS 2C4G + RDS 2C2G (最大连接数 1000)

module.exports = {
  apps: [{
    name: 'qzt-backend',
    script: './dist/main.js',

    // === 集群配置（2C4G 优化）===
    instances: process.env.PM2_CLUSTER_ENABLED === 'true'
      ? 2  // 2C4G 用 2 个实例
      : 1, // 单实例模式
    exec_mode: process.env.PM2_CLUSTER_ENABLED === 'true' ? 'cluster' : 'fork',

    // === 内存配置（关键）===
    // 2实例 × 700MB = 1.4GB，留 2.6GB 给系统、Frontend、Website
    max_memory_restart: '700M',

    env: {
      NODE_ENV: 'production',
      PORT: 7890,
      // Node.js 堆内存限制（防止 V8 堆内存无限增长）
      // 略低于 max_memory_restart，确保触发 PM2 重启前先触发 GC
      NODE_OPTIONS: '--max-old-space-size=640',
    },

    // === 日志配置 ===
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    log_file_size: 10485760,  // 10MB 轮转
    merge_logs: true,

    // === 重启策略 ===
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,

    // === 优雅关闭 ===
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // === 定时重启（清理内存泄漏）===
    cron_restart: '0 3 * * *',  // 每天凌晨 3 点重启
  }]
}
