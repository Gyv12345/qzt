// ============================================================
// PM2 配置 - 企智通 Website (Next.js 15 Standalone)
// ============================================================
// 适配 ECS 2C4G 部署

module.exports = {
  apps: [{
    name: 'qzt-website',
    script: './node_modules/.bin/next',
    args: 'start',

    // 单实例即可（SSR 不适合多实例，除非有 session affinity）
    instances: 1,
    exec_mode: 'fork',

    // === 内存配置 ===
    max_memory_restart: '500M',

    env: {
      NODE_ENV: 'production',
      PORT: 5180,
      HOSTNAME: '0.0.0.0',
      // Next.js 运行时内存限制
      NODE_OPTIONS: '--max-old-space-size=448',
      // 禁用 Telemetry
      NEXT_TELEMETRY_DISABLED: 1,
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
