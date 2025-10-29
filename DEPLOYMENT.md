# Deployment Guide

## ⚠️ Important: Socket.io Limitation on Vercel

**Socket.io (multiplayer/real-time features) will NOT work on Vercel** because:

- Vercel uses serverless functions that are stateless
- Socket.io requires persistent WebSocket connections
- Serverless functions timeout and can't maintain connections

### Current Setup

- ✅ REST API endpoints (login, register, customization) work on Vercel
- ❌ Socket.io multiplayer features need a different hosting solution

## Option 1: Hybrid Deployment (Recommended)

### Part 1: REST API on Vercel (Current Setup)

1. Deploy your current code to Vercel
2. The `api/index.js` file handles all REST endpoints
3. Make sure environment variables are set in Vercel:
   - `MONGODB_URI`
   - `JWT_SECRET`

### Part 2: Socket.io Server (Separate Hosting)

For multiplayer to work, you need to deploy `server/index.js` to a platform that supports persistent connections:

**Recommended Platforms:**

- **Railway** (https://railway.app) - Easy setup, free tier available
- **Render** (https://render.com) - Free tier with WebSocket support
- **Fly.io** (https://fly.io) - Good for WebSocket apps
- **Heroku** (https://heroku.com) - Traditional option
- **DigitalOcean App Platform** - Simple and reliable

#### Example: Deploying Socket.io Server to Railway

1. Create a new project on Railway
2. Connect your GitHub repo
3. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT` (Railway will set this automatically)
4. Configure startup command: `node server/index.js`
5. Update your frontend to connect to the Railway URL

#### Update Frontend Connection

In `public/js/game.js`, change:

```javascript
// Instead of:
gameState.socket = io();

// Use:
const socketUrl =
  process.env.NODE_ENV === "production"
    ? "https://your-railway-app.railway.app"
    : "http://localhost:3000";
gameState.socket = io(socketUrl);
```

## Option 2: Full Deployment to Platform Supporting WebSockets

Deploy everything to a platform that supports WebSockets:

1. **Railway** (Recommended - easiest)

   - Connect repo
   - Set environment variables
   - Use `server/index.js` as entry point
   - Update `package.json` start script

2. **Render**
   - Create a Web Service
   - Use `server/index.js`
   - Enable WebSocket support in settings

## Environment Variables Needed

Make sure these are set in your hosting platform:

```

```

## Testing Locally

1. Start the full server: `npm start`
2. Or use the REST API only: The `api/index.js` is configured for Vercel

## File Upload Storage

Note: File uploads (`uploads/` folder) won't persist on serverless platforms. Consider:

- Using cloud storage (AWS S3, Cloudinary, etc.)
- Or deploying to a platform with persistent storage
