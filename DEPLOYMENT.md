# Deployment Guide

## 🚀 Production Deployment

### Prerequisites

1. **Server Requirements:**
   - Node.js 18+ 
   - 1GB+ RAM
   - 5GB+ storage

2. **External Services:**
   - AWS S3 bucket
   - Shopify store with webhook access
   - Printful account with API access

### Environment Setup

1. **Create production environment file:**
```bash
cp env.example .env.production
```

2. **Configure all required variables:**
```bash
# Server
NODE_ENV=production
PORT=3000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_production_access_key
AWS_SECRET_ACCESS_KEY=your_production_secret_key
S3_BUCKET_NAME=your-production-bucket

# Shopify
SHOPIFY_WEBHOOK_SECRET=your_production_webhook_secret
SHOPIFY_STORE_URL=yourstore.myshopify.com

# Printful
PRINTFUL_API_KEY=your_production_printful_key
PRINTFUL_STORE_ID=your_production_store_id

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Check service status:**
```bash
docker-compose ps
docker-compose logs -f app
```

### Manual Deployment

1. **Install dependencies:**
```bash
npm ci --only=production
```

2. **Start the application:**
```bash
npm start
```

3. **Use PM2 for process management:**
```bash
npm install -g pm2
pm2 start server.js --name tshirt-designer
pm2 startup
pm2 save
```

### Nginx Configuration

Create `/etc/nginx/sites-available/tshirt-designer`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Configuration

1. **Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **Obtain SSL certificate:**
```bash
sudo certbot --nginx -d your-domain.com
```

### Shopify Webhook Setup

1. **Configure webhooks in Shopify Admin:**
   - Go to Settings > Notifications
   - Add webhook URL: `https://your-domain.com/api/webhooks/shopify/orders/created`
   - Set format to JSON
   - Copy webhook secret to environment variables

2. **Test webhook:**
```bash
curl -X POST https://your-domain.com/api/webhooks/shopify/orders/created \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: your_hmac" \
  -d '{"test": "webhook"}'
```

### Monitoring Setup

1. **Health checks:**
```bash
# Basic health check
curl https://your-domain.com/health

# Detailed system info
curl https://your-domain.com/api/debug/system-info
```

2. **Log monitoring:**
```bash
# View application logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log
```

3. **Set up monitoring alerts:**
   - Monitor `/health` endpoint
   - Set up alerts for error rates
   - Monitor disk space and memory usage

### Backup Strategy

1. **S3 file backups:**
   - Enable S3 versioning
   - Set up cross-region replication
   - Configure lifecycle policies

### Scaling Considerations

1. **Horizontal scaling:**
   - Use load balancer (AWS ALB, Nginx)
   - Deploy multiple app instances
   - Use Redis for session storage if needed

2. **S3 scaling:**
   - Use CloudFront for global distribution
   - Monitor S3 request patterns
   - Consider S3 Transfer Acceleration

3. **File storage scaling:**
   - Use CloudFront for S3 file delivery
   - Implement CDN caching
   - Monitor S3 request patterns

### Security Checklist

- [ ] Environment variables secured
- [ ] Webhook signatures verified
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] SSL/TLS enabled
- [ ] S3 bucket access restricted
- [ ] S3 bucket permissions minimal
- [ ] Regular security updates
- [ ] Log monitoring enabled
- [ ] Error handling comprehensive

### Performance Optimization

1. **Font preloading:**
   - Fonts are preloaded on startup
   - Consider CDN for font delivery
   - Monitor font loading times

2. **Canvas rendering:**
   - Monitor rendering performance
   - Consider caching rendered images
   - Optimize image compression

3. **S3 operations:**
   - Monitor S3 request patterns
   - Optimize file upload/download
   - Use appropriate storage classes

### Troubleshooting

1. **Common issues:**
   - Check environment variables
   - Verify external service connectivity
   - Monitor application logs
   - Test individual components

2. **Debug endpoints:**
   - `/api/debug/test-fonts` - Test font loading
   - `/api/debug/test-s3` - Test S3 connectivity
   - `/api/debug/test-printful` - Test Printful API
   - `/api/debug/system-info` - System information

3. **Recovery procedures:**
   - Restart failed services
   - Retry failed orders
   - Restore from backups if needed
   - Contact support for critical issues

### Maintenance

1. **Regular tasks:**
   - Monitor system health
   - Update dependencies
   - Clean up old files
   - Review error logs

2. **Scheduled maintenance:**
   - S3 cleanup and optimization
   - Log rotation
   - Security updates
   - Performance reviews
