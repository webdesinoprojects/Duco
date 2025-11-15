# Category Setup Guide

## Issue
The navbar mega menu expects specific category names to match the menu items, but the categories created in the admin panel might have different names.

## Expected Category Names

For the navbar to work properly, you need to create categories with these **exact names** (or the system will try to match them):

### Required Categories:
1. **Men's Clothing** (or "Men")
2. **Women's Clothing** (or "Women") 
3. **Kid's Clothing** (or "Kid" or "Kids")
4. **Corporate T-Shirt** (or "Bulk Order")

## How to Fix

### Option 1: Create Categories with Expected Names
Go to `http://localhost:5173/admin/category` and create these categories:
- Men's Clothing
- Women's Clothing
- Kid's Clothing
- Corporate T-Shirt

Then create subcategories under each (e.g., "Round Neck", "V-Neck", "Polo", etc.)

### Option 2: Update Existing Categories
If you already have categories with different names, you can either:
1. Delete and recreate them with the correct names
2. Or update the navbar mapping to match your category names

## Debugging

The console will now show:
- `📁 Fetched categories:` - All categories from the database
- `⚠️ No matching category found for:` - When a navbar item doesn't match any category
- `🔍 Fetching subcategories for:` - When a match is found
- `📂 Fetched subcategories:` - The subcategories loaded

## Current Navbar Menu Items:
- Home → No category needed
- Men → Looks for "Men" or "Men's Clothing"
- Women → Looks for "Women" or "Women's Clothing"  
- Kid → Looks for "Kid", "Kids", or "Kid's Clothing"
- Bulk Order → Looks for "Corporate T-Shirt" or "Bulk Order"

## Testing
1. Open browser console (F12)
2. Hover over "Men", "Women", "Kid", or "Bulk Order" in the navbar
3. Check console logs to see what's being fetched
4. If no subcategories appear, check if:
   - Categories exist with matching names
   - Subcategories are linked to the correct parent category
