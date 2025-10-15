# 🚀 Complete Render.com Deployment Guide

## 📋 **Pre-Deployment Checklist**

Before deploying, verify these items are ready:

### ✅ **Required Accounts & Access**
- [ ] **Render.com account** - Sign up at [render.com](https://render.com)
- [ ] **GitHub account** - Your code is in a GitHub repository
- [ ] **AWS account** - For S3 file storage
- [ ] **Printful account** - For order fulfillment
- [ ] **Shopify store** - Your e-commerce store

### ✅ **Required Information**
- [ ] **AWS Access Key ID** - From AWS IAM console
- [ ] **AWS Secret Access Key** - From AWS IAM console
- [ ] **S3 Bucket Name** - Your AWS S3 bucket name
- [ ] **Printful API Key** - From Printful dashboard
- [ ] **Printful Store ID** - From Printful dashboard
- [ ] **Shopify Webhook Secret** - From Shopify admin
- [ ] **Shopify Store URL** - Your store's myshopify.com URL

### ✅ **Code Verification**
- [ ] **render.yaml file** - Present in project root ✅
- [ ] **.renderignore file** - Present in project root ✅
- [ ] **package.json** - Has "start" script ✅
- [ ] **server.js** - Uses process.env.PORT ✅
- [ ] **All dependencies** - Listed in package.json ✅

---

## 🚀 **Step-by-Step Deployment Instructions**

### **Step 1: Create Render Account (5 minutes)**

1. **Go to Render.com**
   - Visit [render.com](https://render.com)
   - Click "Get Started for Free"

2. **Sign Up**
   - Click "Sign up with GitHub"
   - Authorize Render to access your GitHub account
   - Complete your profile setup

### **Step 2: Connect Your Repository (2 minutes)**

1. **In Render Dashboard**
   - Click "New" → "Web Service"
   - Click "Connect a repository"

2. **Select Your Repository**
   - Find "Japanessiev2" in the list
   - Click "Connect"

### **Step 3: Configure Service Settings (3 minutes)**

1. **Basic Settings**
   - **Name**: `japanessie-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your customers
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (uses project root)

2. **Build & Deploy Settings**
   - **Build Command**: `npm install` (auto-filled)
   - **Start Command**: `npm start` (auto-filled)
   - **Plan**: Select "Free" (for now)

3. **Advanced Settings**
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Yes (deploys when you push to GitHub)

### **Step 4: Set Environment Variables (10 minutes)**

Click "Environment" tab and add these variables:

#### **🔑 Required Environment Variables**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Tells the app it's running in production |
| `PORT` | `3000` | Port number (Render sets this automatically) |
| `AWS_REGION` | `us-east-1` | AWS region where your S3 bucket is located |
| `AWS_ACCESS_KEY_ID` | `[Your AWS Key]` | AWS access key for S3 access |
| `AWS_SECRET_ACCESS_KEY` | `[Your AWS Secret]` | AWS secret key for S3 access |
| `S3_BUCKET_NAME` | `[Your Bucket Name]` | Name of your S3 bucket |
| `PRINTFUL_API_KEY` | `[Your Printful Key]` | Printful API key for order processing |
| `PRINTFUL_STORE_ID` | `[Your Store ID]` | Your Printful store identifier |
| `PRINTFUL_CATALOG_PRODUCT_ID` | `[Your Product ID]` | Printful catalog product ID |
| `SHOPIFY_WEBHOOK_SECRET` | `[Your Webhook Secret]` | Secret for verifying Shopify webhooks |
| `SHOPIFY_STORE_URL` | `[Your Store].myshopify.com` | Your Shopify store URL |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` | Domains allowed to access your API |

#### **🔧 Optional Environment Variables**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PRINT_RENDERER_V2` | `1` | Enables the new print rendering system |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiting window (60 seconds) |
| `RATE_LIMIT_MAX_REQUESTS` | `300` | Max requests per window |
| `LOG_LEVEL` | `info` | Logging level (info, debug, error) |

### **Step 5: Deploy (5 minutes)**

1. **Review Settings**
   - Double-check all environment variables are set
   - Verify build and start commands

2. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (2-3 minutes)
   - Watch the build logs for any errors

3. **Get Your URL**
   - Once deployed, you'll get a URL like: `https://japanessie-backend.onrender.com`
   - **Save this URL** - you'll need it for Shopify webhooks

---

## 🔍 **Where to Find Environment Variable Values**

### **AWS Credentials**
1. **Go to AWS Console** → IAM → Users
2. **Select your user** → Security credentials tab
3. **Create access key** → Copy Access Key ID and Secret Access Key
4. **S3 Bucket Name**: AWS Console → S3 → Your bucket name

### **Printful Credentials**
1. **Go to Printful Dashboard** → Settings → API
2. **API Key**: Copy your API key
3. **Store ID**: Found in your store settings
4. **Catalog Product ID**: Products → Catalog → Find your product → Copy ID

### **Shopify Credentials**
1. **Go to Shopify Admin** → Settings → Notifications
2. **Webhook Secret**: Create a webhook → Copy the secret
3. **Store URL**: Your store's myshopify.com URL (e.g., `mystore.myshopify.com`)

---

## ✅ **Post-Deployment Verification**

### **Step 1: Test Health Endpoint**
```bash
# Open in browser or use curl
https://your-app-name.onrender.com/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

### **Step 2: Test API Endpoints**
```bash
# Test root endpoint
https://your-app-name.onrender.com/

# Should return API information
```

### **Step 3: Check Logs**
1. **In Render Dashboard**
   - Go to your service
   - Click "Logs" tab
   - Look for "Server running on port 3000"
   - Check for any error messages

### **Step 4: Test Webhook Endpoint**
```bash
# Test webhook endpoint (this will fail but should return proper error)
curl -X POST https://your-app-name.onrender.com/webhooks/shopify/orders/created \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Should return an error (this is normal - webhook needs proper Shopify headers)
```

---

## 📊 **How to Check Logs in Render**

### **Real-Time Logs**
1. **Go to Render Dashboard**
2. **Click on your service**
3. **Click "Logs" tab**
4. **View real-time logs**

### **Log Types to Look For**
- ✅ **Success**: "Server running on port 3000"
- ✅ **Success**: "Order processor initialized"
- ✅ **Success**: "Print generator test passed"
- ❌ **Error**: Any red error messages
- ⚠️ **Warning**: Yellow warning messages (usually OK)

### **Common Log Messages**
```
✅ Server running on port 3000
✅ Order processor initialized
✅ Print generator test passed
✅ Received Shopify order webhook
✅ Order processing completed
```

---

## 🔧 **Troubleshooting Common Issues**

### **Issue 1: Build Fails**
**Symptoms**: Build fails during deployment
**Solutions**:
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check build logs for specific error messages

### **Issue 2: Service Won't Start**
**Symptoms**: Service starts but immediately crashes
**Solutions**:
- Check environment variables are all set
- Verify `NODE_ENV=production` is set
- Check logs for missing environment variables

### **Issue 3: Health Check Fails**
**Symptoms**: Render shows service as unhealthy
**Solutions**:
- Verify health check path is `/health`
- Check that server is listening on correct port
- Ensure no firewall blocking the health endpoint

### **Issue 4: Webhook Timeouts**
**Symptoms**: Shopify webhooks fail with timeout
**Solutions**:
- This is normal with Render FREE tier (cold starts)
- Consider upgrading to paid plan for always-on service
- Or implement keep-alive solution (see below)

### **Issue 5: S3 Upload Fails**
**Symptoms**: Print files not uploading to S3
**Solutions**:
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists in specified region

---

## 🔄 **How to Update Shopify Webhook URL**

### **Step 1: Get Your New URL**
After deployment, your webhook URL will be:
```
https://your-app-name.onrender.com/webhooks/shopify/orders/created
```

### **Step 2: Update in Shopify Admin**
1. **Go to Shopify Admin** → Settings → Notifications
2. **Find your existing webhook** (if any)
3. **Edit the webhook**:
   - **URL**: `https://your-app-name.onrender.com/webhooks/shopify/orders/created`
   - **Format**: JSON
   - **Events**: Order creation
4. **Save changes**

### **Step 3: Test the Webhook**
1. **Create a test order** in your Shopify store
2. **Check Render logs** for webhook reception
3. **Verify order processing** in logs

---

## 🚀 **Keep-Alive Solution (Optional)**

To prevent cold starts on Render FREE tier:

### **Step 1: Add Keep-Alive Endpoint**
Your server already has a health endpoint at `/health` that works for this.

### **Step 2: Set Up Ping Service**
1. **Use UptimeRobot** (free):
   - Sign up at [uptimerobot.com](https://uptimerobot.com)
   - Add monitor: `https://your-app-name.onrender.com/health`
   - Set interval: 10 minutes
   - This keeps your app awake

2. **Alternative: Use Pingdom** (free tier available)

### **Step 3: Verify Keep-Alive**
- Check Render logs - should see regular health check requests
- App should stay awake and respond instantly to webhooks

---

## 📈 **Upgrading from FREE Tier**

### **When to Upgrade**
- Getting 10+ orders per day consistently
- Customers complaining about slow processing
- Making $1000+ monthly revenue

### **Upgrade Options**
1. **Render Starter** ($7/month): Always-on, no cold starts
2. **Railway Hobby** ($5/month): Alternative with better value
3. **DigitalOcean VPS** ($12/month): Full control, most cost-effective

---

## 🎉 **Success Checklist**

After deployment, you should have:

- ✅ **Service running** on Render
- ✅ **Health endpoint** responding
- ✅ **Logs showing** successful startup
- ✅ **Shopify webhooks** updated
- ✅ **Test order** processing successfully
- ✅ **Print files** uploading to S3
- ✅ **Orders** being sent to Printful

---

## 📞 **Getting Help**

### **If You Get Stuck**
1. **Check Render logs** first
2. **Verify environment variables** are all set
3. **Test health endpoint** in browser
4. **Check Shopify webhook** configuration

### **Common Support Resources**
- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Your Project Logs**: Always check logs first

---

## 🎯 **Final Notes**

- **FREE tier limitations**: 30-second cold starts (acceptable for low volume)
- **Automatic deployments**: Push to GitHub = automatic deployment
- **Environment variables**: Set once, used forever
- **Monitoring**: Check logs regularly for issues
- **Scaling**: Easy to upgrade when you grow

**You're now ready to deploy your backend to production! 🚀**
