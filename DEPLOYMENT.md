# Deployment Guide

Bu faylda loyihani production muhitiga deploy qilish bo'yicha qo'llanma keltirilgan.

## Prerequisites

- Node.js 18+ o'rnatilgan
- PostgreSQL 14+ database
- Yarn yoki npm package manager
- Git

## Environment Variables

Production uchun quyidagi environment o'zgaruvchilarini sozlang:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database?schema=public"

# JWT - MUHIM: Production'da o'zgartiring!
JWT_SECRET="very-strong-secret-key-minimum-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="very-strong-refresh-secret-key-minimum-32-characters"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
PORT=3000
NODE_ENV=production
CORS_ORIGIN="https://your-frontend-domain.com"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_WEBHOOK_URL="https://your-api-domain.com/api/v1/telegram/webhook"
```

## Deployment Steps

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd backend-nestjs
```

### 2. Install Dependencies

```bash
yarn install --production=false
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env file with your production values
nano .env
```

### 4. Generate Prisma Client

```bash
yarn prisma:generate
```

### 5. Run Database Migrations

```bash
yarn prisma:migrate:prod
```

### 6. Seed Database (Optional)

```bash
yarn prisma:seed
```

### 7. Build Application

```bash
yarn build
```

### 8. Start Application

```bash
yarn start:prod
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma:generate
RUN yarn build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json yarn.lock ./

EXPOSE 3000

CMD ["yarn", "start:prod"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: saas_platform
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: .
    restart: always
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/saas_platform?schema=public
      JWT_SECRET: your-jwt-secret
      JWT_REFRESH_SECRET: your-refresh-secret
      NODE_ENV: production
    depends_on:
      - postgres
    command: sh -c "yarn prisma:migrate:prod && yarn start:prod"

volumes:
  postgres_data:
```

### Build and Run

```bash
docker-compose up -d
```

## PM2 Deployment

### Install PM2

```bash
npm install -g pm2
```

### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'backend-nestjs',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Health Checks

### Basic Health Check Endpoint

Qo'shimcha health check endpoint qo'shing:

```typescript
// src/app.controller.ts
@Get('health')
healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
```

### Database Health Check

```typescript
@Get('health/db')
async dbHealthCheck() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return { status: 'error', database: 'disconnected' };
  }
}
```

## Monitoring

### Logging

Production'da logging uchun:

```bash
yarn add winston
```

### Error Tracking

Sentry integratsiyasi:

```bash
yarn add @sentry/node
```

## Backup Strategy

### Database Backup

```bash
# Daily backup
pg_dump -h localhost -U postgres -d saas_platform > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres -d saas_platform < backup_20240101.sql
```

### Automated Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres -d saas_platform | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

## Security Checklist

- [ ] JWT secrets o'zgartirilgan va xavfsiz
- [ ] Database credentials xavfsiz
- [ ] CORS to'g'ri sozlangan
- [ ] Rate limiting qo'shilgan
- [ ] Helmet middleware qo'shilgan
- [ ] HTTPS sozlangan
- [ ] Environment variables xavfsiz saqlangan
- [ ] Database backup sozlangan
- [ ] Monitoring va logging sozlangan
- [ ] Error tracking sozlangan

## Performance Optimization

### Database Indexing

Prisma schema'da kerakli indexlar qo'shilgan.

### Caching

Redis cache qo'shish:

```bash
yarn add @nestjs/cache-manager cache-manager
yarn add cache-manager-redis-store
```

### Rate Limiting

```bash
yarn add @nestjs/throttler
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U postgres -d saas_platform

# Check Prisma connection
yarn prisma db pull
```

### Application Not Starting

```bash
# Check logs
pm2 logs backend-nestjs

# Check port availability
lsof -i :3000
```

### Migration Issues

```bash
# Reset database (CAUTION: This will delete all data)
yarn prisma migrate reset

# Create new migration
yarn prisma migrate dev --name migration_name
```

## Scaling

### Horizontal Scaling

- Load balancer (Nginx, HAProxy)
- Multiple application instances
- Session management (Redis)
- Database read replicas

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Enable caching
- Use CDN for static assets

## Maintenance

### Regular Tasks

1. **Daily**: Check logs and monitoring
2. **Weekly**: Database backup verification
3. **Monthly**: Security updates
4. **Quarterly**: Performance review

### Update Process

```bash
# Pull latest changes
git pull origin main

# Install dependencies
yarn install

# Run migrations
yarn prisma:migrate:prod

# Build
yarn build

# Restart application
pm2 restart backend-nestjs
```

## Support

Muammolar yuzaga kelsa:

1. Loglarni tekshiring
2. Database connection'ni tekshiring
3. Environment variables'ni tekshiring
4. Documentation'ni qayta ko'rib chiqing

