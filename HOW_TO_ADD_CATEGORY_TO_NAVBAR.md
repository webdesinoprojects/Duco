# How to Add a New Category to the Navbar

## Quick Method (Using the Helper)

1. Go to `http://localhost:5173/admin/category`
2. Click the **"Show Navbar Helper"** button at the top right
3. Find your category in the list
4. Click the copy button next to the code snippets
5. Open `Duco_frontend/src/Components/Navbar.jsx`
6. Paste the code in the appropriate arrays (see below)

## Manual Method

### Step 1: Open Navbar.jsx
Open `Duco_frontend/src/Components/Navbar.jsx`

### Step 2: Add to Desktop Menu (menuItems array)
Find the `menuItems` array (around line 11) and add your category:

```javascript
const menuItems = [
  { name: "Home", link: "/" ,isbold:false},
  { name: "Men", link: "/men", hasMegaMenu: true, megaCategory: "Men", isbold:true},
  { name: "Women", link: "/women", hasMegaMenu: true, megaCategory: "Women", isbold:true},
  { name: "Kid", link: "/kid", hasMegaMenu: true, megaCategory: "Kid", isbold:true},
  { name: "Bulk Order", link: "/corporate", hasMegaMenu: true, megaCategory: "Corporate T-Shirt", isbold:true},
  // 👇 ADD YOUR NEW CATEGORY HERE
  { name: "Accessories", link: "/accessories", hasMegaMenu: true, megaCategory: "Accessories", isbold:true}
];
```

### Step 3: Add to Mobile Menu (menuItemss array)
Find the `menuItemss` array (around line 19) and add your category:

```javascript
const menuItemss = [
  { name: "Home", link: "/" },
  { name: "Men",   megaCategory: "Men" },
  { name: "Women", megaCategory: "Women" },
  { name: "Kids",  megaCategory: "Kids" },
  { name: "Bulk Order",  megaCategory: "Corporate T-Shirt" },
  // 👇 ADD YOUR NEW CATEGORY HERE
  { name: "Accessories", megaCategory: "Accessories" }
];
```

### Step 4: Important Notes

1. **megaCategory must match exactly**: The `megaCategory` value must match the category name you created in the admin panel (case-sensitive)

2. **Add a comma**: Don't forget to add a comma after the previous item

3. **Link should be unique**: The `link` should be a unique route (e.g., `/accessories`, `/hoodies`, etc.)

4. **Create subcategories**: Make sure to create subcategories for your new category, otherwise the dropdown will be empty

## Example: Adding "Hoodies" Category

### In Admin Panel:
1. Create category: "Hoodies"
2. Create subcategories: "Pullover", "Zip-up", "Oversized", etc.

### In Navbar.jsx:

**Desktop (menuItems):**
```javascript
{ name: "Hoodies", link: "/hoodies", hasMegaMenu: true, megaCategory: "Hoodies", isbold:true}
```

**Mobile (menuItemss):**
```javascript
{ name: "Hoodies", megaCategory: "Hoodies" }
```

## Troubleshooting

### Category not showing in dropdown?
1. Check browser console (F12) for error messages
2. Verify the category name matches exactly (including spaces, capitalization)
3. Make sure you created subcategories for that category
4. Clear browser cache and refresh

### Console shows "No matching category found"?
- The `megaCategory` value doesn't match any category in the database
- Check the console log that shows "Available categories:" to see what names exist
- Update your code to match the exact category name

### Subcategories not loading?
- Make sure subcategories are linked to the correct parent category
- Check that subcategories exist in the database
- Look for error messages in the console

## Testing

After adding your category:
1. Save the file
2. Refresh your browser
3. Hover over the new menu item
4. You should see the subcategories dropdown
5. Check browser console for any errors

## Need Help?

Use the **Navbar Helper** in the admin panel at `/admin/category` - it will generate the exact code you need to copy and paste!
