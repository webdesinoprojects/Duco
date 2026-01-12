#!/usr/bin/env node
/**
 * Fix script to update all blog author avatars to use DUCO logo
 * Run: node Duco_Backend/scripts/fix-blog-avatars.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './Duco_Backend/.env' });

const Blog = require('../DataBase/Models/BlogModel');

const DUCO_LOGO_URL = 'https://ik.imagekit.io/vuavxn05l/duco-logo.png?updatedAt=1757162698605';

async function fixBlogAvatars() {
  try {
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in Duco_Backend/.env');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Update all blogs with missing or incorrect avatars
    console.log('📝 Updating blog author avatars...\n');
    
    const result = await Blog.updateMany(
      {
        $or: [
          { 'author.avatar': { $exists: false } },
          { 'author.avatar': '' },
          { 'author.avatar': '/icons/default-avatar.png' },
          { 'author.avatar': null }
        ]
      },
      {
        $set: {
          'author.avatar': DUCO_LOGO_URL,
          'author.name': 'DUCO ART Team'
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} blog entries`);
    console.log(`⚠️  Matched ${result.matchedCount} blog entries\n`);
    
    // Verify the updates
    const allBlogs = await Blog.find().select('title author');
    console.log('📋 All blogs with updated avatars:');
    allBlogs.forEach(blog => {
      console.log(`   • ${blog.title}`);
      console.log(`     Author: ${blog.author.name}`);
      console.log(`     Avatar: ${blog.author.avatar.substring(0, 50)}...`);
    });
    
    console.log('\n✅ SUCCESS! All blog avatars have been updated');
    console.log('   DUCO ART Team logo is now displayed for all blog posts\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixBlogAvatars();
