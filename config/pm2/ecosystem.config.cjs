// ============================================================
// PM2 Ecosystem 配置 - 企智通 QZT
// ============================================================

module.exports = {
  apps: [
    // ============================================
    // Backend - NestJS API (Cluster 模式)
    // ============================================
    {
      name: 'qzt-backend',
      script: './dist/main.js',
      cwd: '/opt/qzt/backend',
      // 2C4G 使用 2 个实例充分利用 CPU
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 7890,
        // Node.js 堆内存限制（防止 V8 堆内存无限增长）
        NODE_OPTIONS: '--max-old-space-size=640',
      },
      // 内存限制，超过自动重启（2实例 × 700MB = 1.4GB）
      max_memory_restart: '700M',
      // 日志配置（完整日志）
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 合并错误和输出日志
      combine_logs: true,
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // 进程管理
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // 定时重启（清理内存泄漏）
      cron_restart: '0 3 * * *',
      // 环境变量文件
      env_file: '/opt/qzt/backend/.env',
    },

    // ============================================
    // Website - Next.js (Standalone)
    // ============================================
    {
      name: 'qzt-website',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/qzt/website',
      env: {
        NODE_ENV: 'production',
        PORT: 5180,
        HOSTNAME: '0.0.0.0',
        // Next.js 运行时内存限制
        NODE_OPTIONS: '--max-old-space-size=448',
        // 禁用 Telemetry
        NEXT_TELEMETRY_DISABLED: 1,
      },
      // 内存限制
      max_memory_restart: '500M',
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      // 自动重启
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // 进程管理
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // 定时重启（清理内存泄漏）
      cron_restart: '0 3 * * *',
    },
  ],
};
