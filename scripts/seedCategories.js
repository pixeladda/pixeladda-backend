const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Category = require('../models/Category');

dotenv.config({ path: path.join(__dirname, '../.env') });

const categories = [
  { name: 'Wedding Invitation', slug: 'wedding-invitation', description: 'Hindu wedding cards, Muslim wedding cards, and all types of marriage invitation designs' },
  { name: 'Banner Design', slug: 'banner-design', description: 'Flex banners, standee banners, shop banners for all businesses' },
  { name: 'Social Media Post', slug: 'social-media', description: 'Instagram posts, Facebook posts, social media templates' },
  { name: 'Business Card', slug: 'business-card', description: 'Professional business card designs for all industries' },
  { name: 'Invitation Card', slug: 'invitation-card', description: 'Birthday invitations, engagement cards, party invitations' },
  { name: 'Poster Design', slug: 'poster', description: 'Event posters, promotional posters, advertising posters' },
  { name: 'Brochure & Flyer', slug: 'brochure-flyer', description: 'Tri-fold brochures, pamphlets, flyer designs' },
  { name: 'Festival Banner', slug: 'festival-banner', description: 'Diwali, Holi, Navratri, and other festival banners' },
  { name: 'Birthday Designs', slug: 'birthday', description: 'Birthday banners, invitation cards, and decorations' },
  { name: 'Logo Design', slug: 'logo-design', description: 'Business logos, brand identity designs' },
  { name: 'Menu Card', slug: 'menu-card', description: 'Restaurant menus, cafe menu cards' },
  { name: 'Election Campaign', slug: 'election', description: 'Political banners, campaign posters, election materials' },
  { name: 'Certificate Design', slug: 'certificate', description: 'Achievement certificates, appreciation certificates' },
  { name: 'Visiting Card', slug: 'visiting-card', description: 'Modern visiting card templates' },
  { name: 'Calendar Design', slug: 'calendar', description: 'Wall calendars, desk calendars, panchang calendars' }
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME
    });

    console.log('MongoDB connected');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    await Category.insertMany(categories);
    console.log(`✓ Created ${categories.length} categories successfully`);
    
    console.log('\nCategories created:');
    categories.forEach(cat => {
      console.log(`  - ${cat.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
