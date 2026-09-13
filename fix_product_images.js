const mongoose = require('mongoose');
require('./db');

const KEYWORD_IMAGE_MAP = [
  // Phones & Tablets & Watches
  { pattern: /iphone/i, url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=700&auto=format&fit=crop&q=80' },
  { pattern: /ipad|tablet/i, url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&auto=format&fit=crop&q=80' },
  { pattern: /apple watch|smartwatch|watch/i, url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80' },
  { pattern: /oneplus.*smartphone|smartphone|mobile/i, url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&auto=format&fit=crop&q=80' },
  
  // Audio & Cameras & Tech
  { pattern: /buds|earbuds|airpods/i, url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80' },
  { pattern: /headphone|headset|wh-1000xm5|arctis/i, url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80' },
  { pattern: /speaker|marshall|soundlink/i, url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=700&auto=format&fit=crop&q=80' },
  { pattern: /camera|alpha 7/i, url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80' },
  { pattern: /kindle|e-reader/i, url: 'https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=700&auto=format&fit=crop&q=80' },
  { pattern: /monitor|oled/i, url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&auto=format&fit=crop&q=80' },
  { pattern: /ssd|sandisk|hard drive/i, url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /power bank/i, url: 'https://images.unsplash.com/photo-1609592807963-47000d08000b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /stream deck|macro keys/i, url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700&auto=format&fit=crop&q=80' },

  // Gaming
  { pattern: /playstation|ps5|ps6|console|dualsense/i, url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=700&auto=format&fit=crop&q=80' },
  { pattern: /xbox/i, url: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=700&auto=format&fit=crop&q=80' },
  { pattern: /mouse|g502|deathadder|superlight/i, url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop&q=80' },
  { pattern: /keyboard|blackwidow/i, url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&auto=format&fit=crop&q=80' },
  { pattern: /mousepad/i, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80' },
  { pattern: /gaming chair|titan evo/i, url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=700&auto=format&fit=crop&q=80' },

  // Fashion & Apparel & Shoes
  { pattern: /saree|kanjivaram/i, url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&auto=format&fit=crop&q=80' },
  { pattern: /kurta|anarkali/i, url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /dress|maxi/i, url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700&auto=format&fit=crop&q=80' },
  { pattern: /jeans|denim/i, url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=700&auto=format&fit=crop&q=80' },
  { pattern: /t-shirt|tshirt|shirt|hoodie|sweatshirt/i, url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=80' },
  { pattern: /sneakers|jordan|shoes|running shoes|cricket spikes|boots/i, url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80' },
  { pattern: /sunglasses|aviator/i, url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=80' },
  { pattern: /wallet/i, url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=700&auto=format&fit=crop&q=80' },
  { pattern: /bag|rucksack|messenger/i, url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&auto=format&fit=crop&q=80' },

  // Home & Living & Furniture
  { pattern: /sofa|couch/i, url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80' },
  { pattern: /coffee table|dining table|table/i, url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80' },
  { pattern: /office chair|executive chair/i, url: 'https://images.unsplash.com/photo-1580481077197-09d64f0b2f56?w=700&auto=format&fit=crop&q=80' },
  { pattern: /bed|mattress/i, url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&auto=format&fit=crop&q=80' },
  { pattern: /bedsheet|linen/i, url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=700&auto=format&fit=crop&q=80' },
  { pattern: /lamp|floor lamp|desk lamp/i, url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80' },
  { pattern: /bookcase|bookshelf|shelf/i, url: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=700&auto=format&fit=crop&q=80' },
  { pattern: /rug|carpet/i, url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=700&auto=format&fit=crop&q=80' },
  { pattern: /vase|flower vase/i, url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=700&auto=format&fit=crop&q=80' },
  { pattern: /curtain|curtains/i, url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&auto=format&fit=crop&q=80' },

  // Kitchen & Appliances
  { pattern: /pressure cooker|cooker|instant pot/i, url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=700&auto=format&fit=crop&q=80' },
  { pattern: /skillet|dutch oven|cookware/i, url: 'https://images.unsplash.com/photo-1584990347449-3990924e2316?w=700&auto=format&fit=crop&q=80' },
  { pattern: /mixer grinder|smoothie maker|blender/i, url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /air fryer|microwave oven|oven/i, url: 'https://images.unsplash.com/photo-1586208958839-06c17cacdf08?w=700&auto=format&fit=crop&q=80' },
  { pattern: /refrigerator|fridge/i, url: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=700&auto=format&fit=crop&q=80' },
  { pattern: /vacuum cleaner/i, url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=700&auto=format&fit=crop&q=80' },
  { pattern: /ceiling fan|fan/i, url: 'https://images.unsplash.com/photo-1618944847823-289566e6c6ff?w=700&auto=format&fit=crop&q=80' },
  { pattern: /air purifier/i, url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop&q=80' },
  { pattern: /water purifier|geyser|water heater/i, url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=700&auto=format&fit=crop&q=80' },
  { pattern: /water bottle|flask/i, url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=700&auto=format&fit=crop&q=80' },
  { pattern: /mug|coffee mug/i, url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80' },
  { pattern: /food storage|glass.*container/i, url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=700&auto=format&fit=crop&q=80' },
  { pattern: /knife|chef knife/i, url: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=700&auto=format&fit=crop&q=80' },

  // Food & Groceries
  { pattern: /milk/i, url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=700&auto=format&fit=crop&q=80' },
  { pattern: /apple/i, url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=700&auto=format&fit=crop&q=80' },
  { pattern: /banana/i, url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=700&auto=format&fit=crop&q=80' },
  { pattern: /tea|green tea|black tea/i, url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=700&auto=format&fit=crop&q=80' },
  { pattern: /honey/i, url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=700&auto=format&fit=crop&q=80' },
  { pattern: /almond|almonds|chia seeds/i, url: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=700&auto=format&fit=crop&q=80' },
  { pattern: /coffee|coffee beans|roast/i, url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&auto=format&fit=crop&q=80' },
  { pattern: /chocolate/i, url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /salt|pink salt/i, url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80' },
  { pattern: /coconut oil|olive oil|oil/i, url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&auto=format&fit=crop&q=80' },

  // Sports & Fitness
  { pattern: /yoga mat/i, url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&auto=format&fit=crop&q=80' },
  { pattern: /dumbbell|barbell|gym/i, url: 'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=700&auto=format&fit=crop&q=80' },
  { pattern: /treadmill/i, url: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=700&auto=format&fit=crop&q=80' },
  { pattern: /badminton|racket/i, url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=700&auto=format&fit=crop&q=80' },
  { pattern: /football|soccer/i, url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=700&auto=format&fit=crop&q=80' },
  { pattern: /resistance|band|jump rope|skipping/i, url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&auto=format&fit=crop&q=80' },

  // Beauty & Personal Care
  { pattern: /cleanser|face wash/i, url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80' },
  { pattern: /serum|niacinamide|vitamin c/i, url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=700&auto=format&fit=crop&q=80' },
  { pattern: /hair oil|shampoo|hair mask/i, url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&auto=format&fit=crop&q=80' },
  { pattern: /shower gel|scrub/i, url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80' },
  { pattern: /shaver|laser|hair removal/i, url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=700&auto=format&fit=crop&q=80' },
  { pattern: /sauvage|parfum|perfume|fragrance/i, url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700&auto=format&fit=crop&q=80' }
];

const CATEGORY_DEFAULT_IMAGES = {
  'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
  'Gaming': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=700&auto=format&fit=crop&q=80',
  'Food & Beverages': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=700&auto=format&fit=crop&q=80',
  'Home & Furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80',
  'Furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80',
  'Beauty & Care': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=700&auto=format&fit=crop&q=80',
  'Fashion': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=80',
  'Shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
  'Footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
  'shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
  'Kitchen': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=700&auto=format&fit=crop&q=80',
  'Appliances': 'https://images.unsplash.com/photo-1586208958839-06c17cacdf08?w=700&auto=format&fit=crop&q=80',
  'Sports & Fitness': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&auto=format&fit=crop&q=80',
  'General': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80',
  'Others': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80'
};

function getImageForProduct(prod) {
  const name = prod.name || '';
  for (const mapping of KEYWORD_IMAGE_MAP) {
    if (mapping.pattern.test(name)) {
      return mapping.url;
    }
  }
  return CATEGORY_DEFAULT_IMAGES[prod.category] || CATEGORY_DEFAULT_IMAGES['Others'];
}

mongoose.connection.once('open', async () => {
  const Product = require('./models/product.model');
  const products = await Product.find();
  console.log(`Updating high-quality product images for all ${products.length} products...`);

  let updatedCount = 0;
  for (const prod of products) {
    const imgUrl = getImageForProduct(prod);
    await Product.updateOne(
      { _id: prod._id },
      {
        $set: {
          image: imgUrl,
          images: [imgUrl]
        }
      }
    );
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} products with high-definition product images.`);
  process.exit(0);
});
