// ============================================================
// PM2 Ecosystem 配置 - 企智通生产环境 (Ubuntu)
// Ubuntu 22.04/24.04 2C4G + 独立 MySQL 2C2G + Redis
// ============================================================

module.exports = {
  apps: [
    // ===== Backend (NestJS) =====
    {
      name: 'qzt-backend',
      script: '/var/www/qzt/backend/dist/main.js',

      // === 实例配置（2C4G 优化）===
      instances: 2,  // 2C4G 用 2 个实例
      exec_mode: 'cluster',

      // === 内存配置 ===
      max_memory_restart: '700M',  // 每实例最大 700MB

      env: {
        NODE_ENV: 'production',
        PORT: 7890,
        // V8 堆内存限制
        NODE_OPTIONS: '--max-old-space-size=640',
        // Redis 连接（本地）
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: 6379,
      },

      // === 日志配置 ===
      error_file: '/var/www/qzt/logs/backend-error.log',
      out_file: '/var/www/qzt/logs/backend-out.log',
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

      // === 定时重启（清理内存）===
      cron_restart: '0 3 * * *',  // 每天凌晨 3 点
    },

    // ===== Website (Next.js) =====
    {
      name: 'qzt-website',
      script: '/var/www/qzt/website/server.js',

      // === 实例配置 ===
      instances: 1,  // Next.js standalone 模式用单实例
      exec_mode: 'fork',

      // === 内存配置 ===
      max_memory_restart: '500M',

      env: {
        NODE_ENV: 'production',
        PORT: 5180,
        HOSTNAME: '0.0.0.0',
        NODE_OPTIONS: '--max-old-space-size=450',
      },

      // === 日志配置 ===
      error_file: '/var/www/qzt/logs/website-error.log',
      out_file: '/var/www/qzt/logs/website-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file_size: 10485760,
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

      // === 定时重启 ===
      cron_restart: '0 3 * * *',
    },
  ],
};
