# Auto-Rotating Banner - Quick Guide

## What's New?
The hero section now **automatically rotates through all banners randomly** every 5 seconds. Users will see different banners without refreshing the page.

---

## How It Works

1. **Page Loads** → Displays random banner
2. **Every 5 seconds** → Switches to another random banner
3. **Continuous** → Keeps rotating as long as page is open
4. **All Banners Visible** → Over time, users see all banners

---

## Example

```
Time 0s:   [Banner 1: Summer Sale]
Time 5s:   [Banner 3: New Arrivals]
Time 10s:  [Banner 2: Winter Collection]
Time 15s:  [Banner 4: Flash Sale]
Time 20s:  [Banner 1: Summer Sale] (repeats)
...
```

---

## For Users

✅ **No action needed** - Banners rotate automatically
✅ **See all promotions** - All banners display over time
✅ **Engaging** - Page feels dynamic and fresh
✅ **Works on all devices** - Mobile, tablet, desktop

---

## For Admins

### Create Multiple Banners
1. Go to **Admin > Banner Setup**
2. Create 3-5 banners with different images
3. Each banner will rotate automatically

### Test Auto-Rotation
1. Create 3+ banners
2. Go to home page
3. Watch banner change every 5 seconds
4. Open browser console (F12) to see rotation logs

### Change Rotation Speed
Edit `Duco_frontend/src/Pages/Home.jsx`:
```javascript
// Line with: }, 5000);
// Change 5000 to:
// 3000 = 3 seconds
// 5000 = 5 seconds (current)
// 10000 = 10 seconds
```

---

## Browser Console Output

You'll see messages like:
```
🎨 Fetching banners from: http://localhost:3000/api/banners
🎨 Displaying random banner (4 total)
🎨 Auto-rotating to random banner
🎨 Auto-rotating to random banner
...
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Banners not rotating | Create more banners in admin panel |
| Same banner twice | Normal with random selection |
| Rotation too fast | Increase interval value (5000 = 5s) |
| Rotation too slow | Decrease interval value |
| Only one banner | Create more banners |

---

## Technical Details

### What Rotates:
- ✅ Banner image
- ✅ Hero text
- ✅ Button text
- ✅ Button link

### Rotation Interval:
- **Current**: 5 seconds
- **Configurable**: Edit Home.jsx

### Selection Method:
- **Random**: Each banner has equal chance
- **Continuous**: Repeats indefinitely

---

## Files Modified

- `Duco_frontend/src/Pages/Home.jsx` - Added auto-rotation logic

---

## Next Steps

1. ✅ Create 3-5 banners in admin panel
2. ✅ Go to home page
3. ✅ Watch banners rotate every 5 seconds
4. ✅ Verify all banners display over time

---

## Tips

💡 **Create diverse banners** - Different images, text, and links
💡 **Use compelling text** - Make each banner interesting
💡 **Test on mobile** - Ensure banners look good on all devices
💡 **Monitor console** - Check for any errors

---

**Status**: ✅ Ready to use!
