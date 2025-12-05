# Dynamic Hero Section - Quick Start Guide

## What's New?
The main page hero section is now **fully dynamic**. You can change the banner image, hero text, button text, and button link from the admin panel without touching any code.

---

## How to Use

### Step 1: Go to Banner Setup
1. Login to admin panel: `http://localhost:5173/admin`
2. Navigate to: **Admin > Banner Setup** (or `/admin/bannersetup`)

### Step 2: Create a Banner
You have two options:

**Option A: Paste Image URL**
1. Paste an image URL in the "Paste image URL" field
2. Fill in the optional fields:
   - **Hero text**: What text to show on the banner (e.g., "Summer Sale")
   - **Button text**: What the button should say (e.g., "Shop Now")
   - **Button link**: Where the button should go (e.g., "/sale")
3. Click "Add URL"

**Option B: Upload Image**
1. Click "📤 Upload Banner Image"
2. Select an image from your computer
3. Fill in the optional fields (same as above)
4. Image will be uploaded and added automatically

### Step 3: View on Home Page
1. Go to home page: `http://localhost:5173/`
2. The first banner you created will display as the hero section
3. The hero text, button text, and button link will be dynamic

### Step 4: Edit or Delete
- **Edit**: Click "Edit" button on any banner to change the image URL, hero text, button text, or button link
- **Delete**: Click "Delete" button to remove a banner

---

## Example: Create a Summer Sale Banner

1. **Image URL**: `https://example.com/summer-banner.jpg`
2. **Hero Text**: `Summer Collection\nUp to 50% Off`
   - (Use `\n` for line breaks)
3. **Button Text**: `Shop Summer Collection`
4. **Button Link**: `/summer-collection`
5. Click "Add URL"
6. Go to home page and see the banner!

---

## Default Values

If you don't fill in the optional fields, these defaults are used:
- **Hero Text**: "Color Of Summer Outfit"
- **Button Text**: "Shop the Look →"
- **Button Link**: "/women"

---

## Tips

✅ **Use line breaks in hero text**: Use `\n` to create line breaks
   - Example: `Color Of\nSummer\nOutfit`

✅ **Keep hero text short**: Long text may overflow on mobile

✅ **Use valid image URLs**: Make sure the image URL is accessible

✅ **Test button links**: Make sure the button link exists in your app

✅ **Upload images**: Use the ImageKit upload for better reliability

---

## Troubleshooting

**Q: Banner not showing on home page?**
A: Make sure you created at least one banner in the admin panel. The first banner is displayed on the home page.

**Q: Hero text not showing?**
A: Refresh the home page. The text should appear on the banner image.

**Q: Button link not working?**
A: Make sure the button link is correct (e.g., "/women", "/sale", etc.)

**Q: Image not loading?**
A: Try uploading the image via ImageKit instead of pasting a URL.

---

## API Endpoints (For Developers)

### Create Banner
```bash
curl -X POST http://localhost:3000/api/banners \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://example.com/banner.jpg",
    "heroText": "Summer Sale",
    "buttonText": "Shop Now",
    "buttonLink": "/sale"
  }'
```

### Get All Banners
```bash
curl http://localhost:3000/api/banners
```

### Update Banner
```bash
curl -X PUT http://localhost:3000/api/banners/:id \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://example.com/new-banner.jpg",
    "heroText": "New Text",
    "buttonText": "New Button",
    "buttonLink": "/new-link"
  }'
```

### Delete Banner
```bash
curl -X DELETE http://localhost:3000/api/banners/:id
```

---

## What Gets Displayed

The **first banner** in the database is displayed on the home page:

```
┌─────────────────────────────────────┐
│                                     │
│  [Banner Image]                     │
│                                     │
│  Hero Text (from banner)            │
│  [Button with button text]          │
│                                     │
└─────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Create your first banner
2. ✅ Go to home page and verify it displays
3. ✅ Edit the banner to test changes
4. ✅ Create multiple banners (first one will display)
5. ✅ Delete old banners

---

## Support

If you have any issues:
1. Check the browser console for errors
2. Verify the backend is running on port 3000
3. Verify the image URL is accessible
4. Try uploading the image via ImageKit instead

---

**Status**: ✅ Ready to use!
