const mongoose = require('mongoose');
require('../db');
const Review = require('../models/review.model');
const Product = require('../models/product.model');

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop&q=80'
];

async function run() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const reviews = await Review.find();
  console.log('Total reviews in DB:', reviews.length);
  let updated = 0;

  for (let i = 0; i < reviews.length; i++) {
    const rev = reviews[i];
    // Give half of the reviews realistic customer photos
    if (i % 2 === 0 && (!rev.images || rev.images.length === 0)) {
      const p1 = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];
      const p2 = SAMPLE_PHOTOS[(i + 1) % SAMPLE_PHOTOS.length];
      rev.images = (i % 4 === 0) ? [p1, p2] : [p1];
      await rev.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} reviews with customer photo attachments.`);
  process.exit(0);
}

run().catch(console.error);

