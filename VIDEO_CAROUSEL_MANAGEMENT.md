# Video Carousel Management Guide

## 📺 What is the Video Carousel?

The video carousel is the section on the landing page that says:
```
"Here are our products' live reviews"
```

It displays a horizontal scrolling carousel of videos showing customer reviews and product demonstrations.

## 🎯 How to Manage Videos

### Access Video Management

1. Go to Admin Panel: `http://localhost:5173/admin/landing-page`
2. Scroll down to **"🎬 Video Carousel"** section
3. You'll see all current videos listed

### Add a New Video

1. Click **"➕ Add Video"** button
2. A new video field will appear
3. Enter video URL:
   - **Local video:** `/icons/vid1.mp4`
   - **External video:** `https://example.com/video.mp4`
4. Click **"💾 Save All Changes"**

### Edit a Video

1. Find the video you want to edit
2. Click in the URL field
3. Change the URL
4. Click **"💾 Save All Changes"**

### Remove a Video

1. Find the video you want to remove
2. Click **"Remove"** button (red button)
3. Click **"💾 Save All Changes"**

### Reorder Videos

Currently, videos are displayed in the order they appear in the list. To reorder:
1. Remove videos in reverse order
2. Add them back in the desired order

## 📝 Video URL Formats

### Local Videos (Recommended)
```
/icons/vid1.mp4
/icons/vid2.mp4
/icons/vid3.mp4
/icons/vid4.mp4
```

**Location:** `Duco_frontend/public/icons/`

### External Videos
```
https://example.com/video.mp4
https://res.cloudinary.com/your-account/video/upload/v123/video.mp4
https://yourdomain.com/videos/review.mp4
```

## 🎬 Video Requirements

### Format
- **Supported:** MP4, WebM, Ogg
- **Recommended:** MP4 (best browser compatibility)

### Size
- **Recommended:** 5-50 MB
- **Maximum:** 100 MB (for performance)

### Resolution
- **Recommended:** 1280x720 (720p)
- **Minimum:** 640x360 (360p)
- **Aspect Ratio:** 16:9

### Duration
- **Recommended:** 15-60 seconds
- **Maximum:** 5 minutes

## 🎨 How Videos Display

### Desktop
- Width: 300px
- Aspect Ratio: 16:9
- Auto-play: Yes (muted)
- Loop: Yes
- Controls: Yes
- Animation: Continuous horizontal scroll

### Mobile
- Width: 300px (responsive)
- Aspect Ratio: 16:9
- Auto-play: Yes (muted)
- Loop: Yes
- Controls: Yes
- Animation: Faster scroll (8s vs 20s)

## 📊 Video Carousel Features

✅ **Auto-play** - Videos start playing automatically
✅ **Muted** - No sound (respects autoplay policies)
✅ **Loop** - Videos repeat continuously
✅ **Controls** - Users can pause/play
✅ **Responsive** - Works on all devices
✅ **Infinite Scroll** - Seamless carousel animation
✅ **Duplicate** - Videos repeat for continuous effect

## 🔧 How It Works

```
Admin Panel:
1. Edit video URLs
2. Click Save
3. Data saved to database

Home Page:
1. Fetch videos from database
2. Display in carousel
3. Auto-play and loop
4. Continuous scroll animation
```

## 💡 Best Practices

### Video Content
1. **Show real reviews** - Customer testimonials
2. **Product demos** - How to use products
3. **Behind the scenes** - Company culture
4. **Unboxing** - Product unboxing videos
5. **Tutorials** - How-to guides

### Video Quality
1. **Good lighting** - Well-lit videos
2. **Clear audio** - Even though muted, good quality matters
3. **Stable camera** - Use tripod or stabilizer
4. **Professional editing** - Clean transitions
5. **Branding** - Include logo/watermark

### Video Strategy
1. **Rotate regularly** - Update videos monthly
2. **Mix content** - Vary video types
3. **Keep fresh** - Remove old videos
4. **Test performance** - Monitor engagement
5. **Mobile-first** - Optimize for mobile

## 🚀 Adding Videos from Different Sources

### From Local Files
1. Place video in `Duco_frontend/public/icons/`
2. Use path: `/icons/video-name.mp4`
3. Save in admin panel

### From Cloudinary
1. Upload to Cloudinary
2. Get video URL
3. Paste in admin panel
4. Example: `https://res.cloudinary.com/account/video/upload/v123/video.mp4`

### From YouTube
1. Get video URL
2. Convert to embeddable format (if needed)
3. Paste in admin panel

### From AWS S3
1. Upload to S3
2. Get public URL
3. Paste in admin panel
4. Example: `https://bucket.s3.amazonaws.com/video.mp4`

## 🧪 Testing Videos

### Test in Admin Panel
1. Add video URL
2. Save changes
3. Go to home page
4. Scroll to video carousel
5. Verify video plays

### Test on Different Devices
- Desktop (Chrome, Firefox, Safari)
- Tablet (iPad, Android)
- Mobile (iPhone, Android)

### Test Different Formats
- MP4 videos
- WebM videos
- External URLs
- Local paths

## 🆘 Troubleshooting

### Video Not Playing

**Problem:** Video shows but doesn't play

**Solutions:**
1. Check video URL is correct
2. Verify video file exists
3. Check file permissions
4. Try different video format
5. Check browser console for errors

### Video Not Showing

**Problem:** Video carousel section missing

**Solutions:**
1. Refresh page (Ctrl + Shift + R)
2. Check if videos are added in admin
3. Verify backend is running
4. Check browser console for errors

### Video Carousel Not Scrolling

**Problem:** Videos don't scroll horizontally

**Solutions:**
1. Check if CSS animations are enabled
2. Verify multiple videos are added
3. Check browser console for errors
4. Try different browser

### Videos Buffering

**Problem:** Videos take time to load

**Solutions:**
1. Reduce video file size
2. Use lower resolution
3. Compress video
4. Use CDN for hosting
5. Check internet speed

## 📈 Performance Tips

1. **Compress videos** - Use HandBrake or FFmpeg
2. **Use CDN** - Host on Cloudinary or AWS
3. **Lazy load** - Videos load when visible
4. **Mute by default** - Reduces bandwidth
5. **Limit count** - 4-6 videos optimal

## 🎯 Example Setup

### Recommended Configuration
```
Video 1: /icons/customer-review-1.mp4
Video 2: /icons/product-demo.mp4
Video 3: /icons/customer-review-2.mp4
Video 4: /icons/unboxing.mp4
```

### Recommended Rotation
- Update every 2 weeks
- Add 1 new video
- Remove 1 old video
- Keep 4-6 videos total

## 📞 Need Help?

1. Check video URL format
2. Verify video file exists
3. Check browser console (F12)
4. Check backend logs
5. Try different video

## ✅ Verification Checklist

- [ ] Videos added in admin panel
- [ ] Save button clicked
- [ ] Home page refreshed
- [ ] Video carousel visible
- [ ] Videos playing
- [ ] Carousel scrolling
- [ ] Works on mobile
- [ ] Works on desktop

---

**Video Carousel Management Complete! 🎬**
