#!/bin/bash

# NexChat Server Startup Script
echo "🚀 Starting NexChat Server..."

# Check environment
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    echo "  ⚠️ NODE_ENV not set, defaulting to production"
fi

# Check MongoDB connection
if [ -z "$MONGODB_URI" ]; then
    echo "  ❌ MONGODB_URI not set"
    exit 1
fi

# Check Cloudinary credentials
if [ -z "$CLOUDINARY_CLOUD_NAME" ] || [ -z "$CLOUDINARY_API_KEY" ] || [ -z "$CLOUDINARY_API_SECRET" ]; then
    echo "  ⚠️ Cloudinary credentials not fully configured"
fi

# Create logs directory
mkdir -p logs

# Start server
echo "✅ Starting server on port ${PORT:-1000}"
exec node server.js
