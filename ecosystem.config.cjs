module.exports = {
  apps: [
    {
      name: 'rudhvin-enterprises',
      script: 'backend/src/server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGODB_URI: 'embedded'
      }
    }
  ]
};
