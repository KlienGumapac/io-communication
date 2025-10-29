# Railway Setup Guide for Socket.io Server

## Step-by-Step Instructions

### 1. **Create New Project on Railway**

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. **Configure Service Settings**

After Railway detects your project:

1. **Root Directory:** Keep as `/` (root) or set to project root
2. **Start Command:** Set to `node server/index.js`
3. **Build Command:** Leave empty (or use `npm install` if needed)

### 3. **Set Environment Variables**

In Railway dashboard, go to your service → Variables tab, and add:

```

```

### 4. **Generate Public URL**

1. Go to your service → Settings
2. Enable "Generate Domain" or add a custom domain
3. Copy the public URL (e.g., `https://your-app-name.up.railway.app`)

### 5. **Update Frontend Code**

1. Open `public/js/game.js`
2. Find line 741: `'https://your-railway-app.up.railway.app'`
3. Replace with your actual Railway URL (without trailing slash)
4. Save and commit

### 6. **Deploy to Vercel**

After updating the Railway URL in your code:

1. Commit changes to GitHub
2. Vercel will auto-deploy
3. Railway will auto-deploy (if auto-deploy is enabled)

### 7. **Test the Connection**

1. Open your Vercel app (e.g., `https://your-app.vercel.app`)
2. Log in and go to the game
3. Open browser console (F12)
4. You should see: `Connecting to Socket.io server: https://your-railway-url.up.railway.app`
5. Then: `Connected to game server`

## Troubleshooting

### Connection Issues

- **Check Railway logs:** Service → Deployments → View logs
- **Check browser console** for CORS errors
- **Verify Railway URL** is correct in `game.js`
- **Ensure Railway service is running** (should show "Active" status)

### CORS Errors

If you see CORS errors, the Socket.io server already allows all origins (`origin: "*"`). If issues persist:

1. Check Railway public URL is correct
2. Ensure no firewall blocking the connection
3. Verify the URL doesn't have trailing slashes

### Port Issues

Railway automatically sets the `PORT` environment variable. Don't hardcode it to 3000.

## Current Status

✅ Code is ready for Railway deployment
✅ Frontend is configured to connect to Railway in production
✅ CORS is configured to allow all origins
⏳ **NEXT:** Get your Railway public URL and update line 741 in `public/js/game.js`
