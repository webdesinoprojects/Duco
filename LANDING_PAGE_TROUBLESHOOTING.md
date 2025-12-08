# Landing Page Customization - Troubleshooting Guide

## 🔴 Common Issues & Solutions

### Issue 1: 404 Error When Saving

**Error Message:**
```
Error saving landing page: Request failed with status code 404
```

**Cause:** Backend server hasn't been restarted

**Solution:**
1. Stop backend server (Ctrl + C)
2. Restart: `npm start`
3. Wait for "Server running" message
4. Try saving again

---

### Issue 2: Admin Panel Won't Load

**Error Message:**
```
Failed to load resource: the server responded with a status of 404
```

**Cause:** Backend routes not registered

**Solution:**
1. Check `Duco_Backend/index.js` has:
   ```javascript
   const landingPageRoutes = require('./Router/LandingPageRoutes.js');
   app.use('/api', landingPageRoutes);
   ```
2. Restart backend
3. Refresh admin panel

---

### Issue 3: Images Not Uploading

**Error Message:**
```
Image upload failed
```

**Cause:** ImageKit/Cloudinary not configured

**Solution:**
1. Check `.env` has ImageKit credentials
2. Verify API keys are correct
3. Check internet connection
4. Try uploading smaller image (< 5MB)

---

### Issue 4: Changes Not Appearing on Home Page

**Error Message:**
```
No error, but changes don't show
```

**Cause:** Browser cache or page not refreshed

**Solution:**
1. Hard refresh home page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Open in incognito/private window
4. Check if data was actually saved in admin panel

---

### Issue 5: Database Connection Error

**Error Message:**
```
MongoDB connection failed
```

**Cause:** MongoDB not running or wrong connection string

**Solution:**
1. Ensure MongoDB is running
2. Check `.env` has correct `MONGODB_URI`
3. Verify connection string format
4. Check MongoDB credentials

---

### Issue 6: Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:** Another process using port 3000

**Solution:**

**Mac/Linux:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart backend
npm start
```

**Windows:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Restart backend
npm start
```

---

### Issue 7: Module Not Found Error

**Error Message:**
```
Cannot find module './Router/LandingPageRoutes.js'
```

**Cause:** Files not created or wrong path

**Solution:**
1. Verify files exist:
   - `Duco_Backend/Router/LandingPageRoutes.js`
   - `Duco_Backend/Controller/LandingPageController.js`
   - `Duco_Backend/DataBase/Models/LandingPageModel.js`
2. Check file paths in imports
3. Reinstall dependencies: `npm install`
4. Restart backend

---

### Issue 8: CORS Error

**Error Message:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:** Frontend and backend on different origins

**Solution:**
1. Check `Duco_Backend/index.js` CORS config
2. Ensure frontend URL is in `allowedOrigins`
3. Restart backend
4. Clear browser cache

---

### Issue 9: Image URL Not Valid

**Error Message:**
```
Invalid URL
```

**Cause:** Pasted URL is not valid

**Solution:**
1. Verify URL starts with `https://`
2. Check URL is accessible in browser
3. Use image upload button instead
4. Try different image

---

### Issue 10: Save Button Not Working

**Error Message:**
```
No response when clicking save
```

**Cause:** Network issue or backend not responding

**Solution:**
1. Check internet connection
2. Verify backend is running
3. Check browser console for errors
4. Try refreshing admin panel
5. Restart backend

---

## 🧪 Diagnostic Steps

### Step 1: Check Backend Status

```bash
# Check if backend is running
curl http://localhost:3000/api/landing-page

# Expected response:
# {"success":true,"data":{...}}

# If you get 404:
# Backend needs restart
```

### Step 2: Check Database Connection

```bash
# Check MongoDB connection in backend logs
# Should see: "✅ Database connected"

# If not connected:
# 1. Ensure MongoDB is running
# 2. Check connection string in .env
# 3. Verify credentials
```

### Step 3: Check Frontend Configuration

```javascript
// In browser console:
console.log(import.meta.env.VITE_API_BASE_URL)

// Should output:
// http://localhost:3000 (local)
// https://duco-67o5.onrender.com (production)
```

### Step 4: Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try saving landing page
4. Look for request to `/api/landing-page`
5. Check response status and body

---

## 🔧 Advanced Troubleshooting

### Check File Permissions

```bash
# Ensure files are readable
ls -la Duco_Backend/Router/LandingPageRoutes.js
ls -la Duco_Backend/Controller/LandingPageController.js
ls -la Duco_Backend/DataBase/Models/LandingPageModel.js
```

### Check Node Version

```bash
# Ensure Node.js is compatible
node --version

# Should be v14+ or v16+
```

### Check npm Dependencies

```bash
# Verify all dependencies installed
npm list

# If missing, reinstall:
npm install
```

### Check Environment Variables

```bash
# Verify .env file exists
cat Duco_Backend/.env

# Should have:
# MONGODB_URI=...
# PORT=3000
```

---

## 📊 Debugging Checklist

- [ ] Backend server is running
- [ ] MongoDB is connected
- [ ] Port 3000 is available
- [ ] Files exist and have correct paths
- [ ] Environment variables are set
- [ ] CORS is configured
- [ ] Browser cache is cleared
- [ ] Network requests show 200 status
- [ ] Database has landing page document
- [ ] Frontend can fetch data

---

## 🆘 Still Not Working?

### Collect Debug Information

1. **Backend logs:**
   ```bash
   # Restart backend and capture output
   npm start 2>&1 | tee backend.log
   ```

2. **Browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Screenshot any errors

3. **Network requests:**
   - Go to Network tab
   - Try saving
   - Screenshot failed request

4. **Database check:**
   ```bash
   # Check if collection exists
   db.landingpages.findOne()
   ```

### Contact Support

Provide:
1. Backend logs
2. Browser console errors
3. Network request details
4. Environment setup info

---

## ✅ Verification After Fix

1. Backend running: `npm start`
2. MongoDB connected: Check logs
3. API responding: `curl http://localhost:3000/api/landing-page`
4. Admin panel loads: `/admin/landing-page`
5. Can save changes: Click save button
6. Changes appear: Refresh home page

---

## 🎯 Quick Fix Checklist

- [ ] Restart backend server
- [ ] Clear browser cache
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Check MongoDB connection
- [ ] Verify API endpoint responds
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Verify environment variables
- [ ] Reinstall dependencies if needed
- [ ] Restart everything and try again

---

**Troubleshooting Guide Complete! 🔧**
