# T-Shirt Designer Backend

A Node.js backend service that processes custom Japanese t-shirt designs from Shopify and sends them to Printful for printing. The system achieves pixel-perfect consistency between frontend preview and final printed product.

## 🎯 Key Features

- **Pixel-Perfect Rendering**: Server-side canvas rendering that matches frontend exactly
- **Japanese Font Support**: Full support for 5 Google Fonts with proper vertical text handling
- **Shopify Integration**: Webhook-based order processing with signature verification
- **Printful Integration**: Direct order creation and file upload to Printful
- **S3 Storage**: Scalable file storage with organized design file management
- **Error Resilience**: Comprehensive error handling and retry mechanisms
- **Real-time Processing**: Asynchronous order processing with status tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Shopify       │    │   Backend API    │    │   Printful      │
│   Store         │───▶│   (This Service) │───▶│   Print Service │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   AWS S3         │
                       │   File Storage   │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   MongoDB        │
                       │   Database       │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- AWS S3 bucket
- Shopify store with webhook access
- Printful account with API access

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd tshirt-designer-backend
npm install
```

2. **Configure environment:**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Server
NODE_ENV=production
PORT=3000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=tshirt-designer-files

# Shopify
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_STORE_URL=yourstore.myshopify.com

# Printful
PRINTFUL_API_KEY=your_printful_api_key
PRINTFUL_STORE_ID=your_store_id
```

## 📡 API Endpoints

### Webhooks
- `POST /api/webhooks/shopify/orders/created` - Process new orders
- `POST /api/webhooks/shopify/orders/updated` - Handle order updates
- `POST /api/webhooks/shopify/orders/paid` - Process paid orders

### Orders
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders/:orderId/status` - Get order status
- `POST /api/orders/:orderId/retry` - Retry failed order
- `GET /api/orders` - List orders with filtering

### Debug & Testing
- `POST /api/debug/test-render` - Test canvas rendering
- `GET /api/debug/test-fonts` - Test font loading
- `GET /api/debug/system-info` - System information
- `GET /api/debug/sample-data` - Get sample data for testing

## 🎨 Design Processing Pipeline

1. **Webhook Reception**: Shopify sends order with design data
2. **Data Extraction**: Extract design snapshots from order properties
3. **Font Loading**: Load required Google Fonts server-side
4. **Canvas Rendering**: Generate high-resolution print files
5. **S3 Storage**: Store design files with organized structure
6. **Printful Upload**: Upload print-ready files to Printful
7. **Order Creation**: Create Printful order for fulfillment
8. **Status Tracking**: Update order status and tracking information

## 🔧 Technical Details

### Font Rendering
- Supports 5 Google Fonts: Yuji Syuku, Shippori Antique, Huninn, Rampart One, Cherry Bomb One
- Handles both horizontal and vertical Japanese text
- Proper letter spacing and line height calculations
- Hyphen replacement for vertical text (ー → ｜)

### Coordinate System
- Frontend canvas: 600x600px at 72 DPI
- Print output: 3600x4800px at 300 DPI (12"x16" print area)
- Pixel-perfect coordinate transformation between systems

### File Organization
```
S3 Bucket Structure:
designs/
├── {orderId}/
│   ├── {timestamp}/
│   │   ├── print-ready.png    # 300 DPI for printing
│   │   ├── preview.png        # 72 DPI for preview
│   │   ├── mockup.png         # Shirt mockup
│   │   └── metadata.json      # Design metadata
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing
Use the debug endpoints to test individual components:

```bash
# Test font loading
curl http://localhost:3000/api/debug/test-fonts

# Test canvas rendering
curl -X POST http://localhost:3000/api/debug/test-render \
  -H "Content-Type: application/json" \
  -d '{"snapshotData": {...}}'

# Get sample data
curl http://localhost:3000/api/debug/sample-data
```

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /api/debug/system-info` - Detailed system information

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with context
- Performance metrics

### Metrics
- Order processing times
- Success/failure rates
- Font loading performance
- S3 upload/download times

## 🔒 Security

- Webhook signature verification
- Rate limiting on all endpoints
- CORS configuration
- Helmet security headers
- Input validation and sanitization

## 🚀 Deployment

### Docker
```bash
docker build -t tshirt-designer-backend .
docker run -p 3000:3000 --env-file .env tshirt-designer-backend
```

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection string
- AWS credentials and S3 bucket
- Shopify webhook secret
- Printful API credentials

### Scaling Considerations
- Use MongoDB replica sets for high availability
- Implement Redis for session storage if needed
- Use AWS S3 with CloudFront for file delivery
- Consider horizontal scaling with load balancers

## 🐛 Troubleshooting

### Common Issues

1. **Font Loading Failures**
   - Check Google Fonts API access
   - Verify font family names match exactly
   - Check network connectivity

2. **S3 Upload Errors**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket exists in correct region

3. **Printful Integration Issues**
   - Verify API key and store ID
   - Check product variant mappings
   - Ensure file format compatibility

4. **Canvas Rendering Problems**
   - Check font loading status
   - Verify coordinate transformations
   - Test with sample data

### Debug Mode
Enable debug mode for detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the debug endpoints for diagnostics
