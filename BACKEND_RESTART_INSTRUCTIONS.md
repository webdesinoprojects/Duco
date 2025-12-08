# Backend Restart Instructions

## ⚠️ Important: Backend Restart Required

The landing page routes have been added to the backend, but the server needs to be **restarted** for the new routes to be recognized.

## 🔴 Current Error
```
Failed to load resource: the server responded with a status of 404
Error saving landing page: Request failed with status code 404
```

This happens because the backend server is still running the old code without the new landing page routes.

## ✅ How to Fix

### Option 1: Local Development (Recommended)

#### Step 1: Stop the Backend Server
1. Go to your terminal where backend is running
2. Press `Ctrl + C` to stop the server

#### Step 2: Restart the Backend
```bash
cd Duco_Backend
npm start
# or
node index.js
```

#### Step 3: Verify Routes are Loaded
Look for these messages in the console:
```
✅ Server running on port 3000
✅ Database connected
```

#### Step 4: Test the API
Open browser and go to:
```
http://localhost:3000/api/landing-page
```

You should see a JSON response (not 404).

### Option 2: Production (Render/Heroku)

#### Step 1: Redeploy Backend
1. Push changes to GitHub
2. Render/Heroku will auto-redeploy
3. Wait for deployment to complete

#### Step 2: Verify Deployment
Check deployment logs for:
```
✅ Server running on port 3000
✅ Database connected
```

#### Step 3: Test the API
```
https://duco-67o5.onrender.com/api/landing-page
```

## 🧪 Verification Steps

### After Restart, Test These:

1. **Test GET endpoint**
   ```bash
   curl http://localhost:3000/api/landing-page
   ```
   Expected: JSON response with landing page data

2. **Test POST endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/landing-page \
     -H "Content-Type: application/json" \
     -d '{"heroSection":{"heroText":"Test"}}'
   ```
   Expected: Success response

3. **Test in Admin Panel**
   - Go to `/admin/landing-page`
   - Should load without 404 errors
   - Should be able to save changes

## 📋 Checklist

- [ ] Backend server stopped
- [ ] Backend server restarted
- [ ] Console shows "Server running"
- [ ] Console shows "Database connected"
- [ ] API endpoint returns JSON (not 404)
- [ ] Admin panel loads without errors
- [ ] Can save landing page changes

## 🔍 Troubleshooting

### Still Getting 404?

1. **Check if server is running**
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000  # Mac/Linux
   netstat -ano | findstr :3000  # Windows
   ```

2. **Check if routes are registered**
   - Look in `Duco_Backend/index.js`
   - Should have: `app.use('/api', landingPageRoutes);`
   - Should have: `const landingPageRoutes = require('./Router/LandingPageRoutes.js');`

3. **Check if files exist**
   - `Duco_Backend/Router/LandingPageRoutes.js` ✓
   - `Duco_Backend/Controller/LandingPageController.js` ✓
   - `Duco_Backend/DataBase/Models/LandingPageModel.js` ✓

4. **Check MongoDB connection**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Look for "Database connected" in console

### Port Already in Use?

```bash
# Kill process on port 3000
# Mac/Linux:
kill -9 $(lsof -t -i :3000)

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart:
npm start
```

### Module Not Found?

```bash
# Reinstall dependencies
cd Duco_Backend
npm install

# Then restart:
npm start
```

## 📝 What Changed

### Files Added:
- `Duco_Backend/Router/LandingPageRoutes.js`
- `Duco_Backend/Controller/LandingPageController.js`
- `Duco_Backend/DataBase/Models/LandingPageModel.js`

### Files Modified:
- `Duco_Backend/index.js` - Added import and route registration

### Routes Added:
- `GET /api/landing-page` - Fetch landing page data
- `POST /api/landing-page` - Update landing page data
- `POST /api/landing-page/reset` - Reset to defaults

## ✨ After Restart

Once the backend is restarted:

1. ✅ Admin can access `/admin/landing-page`
2. ✅ Can upload and edit images
3. ✅ Can change text and links
4. ✅ Can save changes to database
5. ✅ Home page reflects changes

## 🎯 Next Steps

1. Restart backend server
2. Verify routes are working
3. Go to `/admin/landing-page`
4. Start customizing landing page
5. Save changes
6. Refresh home page to see updates

---

**Backend Restart Complete! 🚀**
