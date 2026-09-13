const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const History = mongoose.model('InventoryHistory', new mongoose.Schema({}, { strict: false }), 'inventoryhistories');
  const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));

  const vendorId = new mongoose.Types.ObjectId('6aa1acc9bb5a7aeb3ecac734');

  // 1. Update Vinayaka Idol image and category
  const ganeshImg = 'https://images.unsplash.com/photo-1567591974584-f1832b45717a?w=800&auto=format&fit=crop&q=80';
  await Product.findByIdAndUpdate('6aa690999ee0abc3569f9177', {
    image: ganeshImg,
    images: [ganeshImg],
    category: 'Pooja & Spiritual'
  });
  console.log('Vinayaka Idol updated with image and category');

  // 2. Add rich notifications for vendor
  await Notification.deleteMany({ userId: vendorId });
  const notifs = [
    {
      userId: vendorId,
      userType: 'vendor',
      title: '🎉 Product Listing Published',
      message: 'Your product "Vinayaka Idol" is now live in the marketplace catalog and visible to customers.',
      type: 'product_created',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15)
    },
    {
      userId: vendorId,
      userType: 'vendor',
      title: '📦 New Order Received #ORD-98214',
      message: 'Customer placed an order for 2 units of "Daikin 1.5 Ton AC". Total: ₹69,284.',
      type: 'new_order',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    {
      userId: vendorId,
      userType: 'vendor',
      title: '⚠️ Low Stock Alert',
      message: 'Product "OnePlus Bullets Wireless Z2" has only 4 units remaining. Consider restocking.',
      type: 'low_stock',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
    },
    {
      userId: vendorId,
      userType: 'vendor',
      title: '💰 Weekly Settlement Dispatched',
      message: 'Payout of ₹1,48,590 has been initiated to your HDFC Bank account (ending in 7890).',
      type: 'payout',
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
    },
    {
      userId: vendorId,
      userType: 'vendor',
      title: '⭐ 5-Star Customer Review',
      message: 'Customer gave 5 stars on "Kindle Paperwhite Signature Edition": Great product!',
      type: 'review',
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
    }
  ];

  await Notification.insertMany(notifs);
  console.log('Added 5 vendor notifications');

  // 3. Ensure Inventory History exists for Vinayaka Idol
  const prod = await Product.findById('6aa690999ee0abc3569f9177').lean();
  const existingHist = await History.findOne({ productId: prod._id }).lean();
  if (!existingHist) {
    await History.create({
      productId: prod._id,
      vendorId: vendorId,
      type: 'PRODUCT_CREATED',
      quantityChange: prod.quantity,
      stockBefore: 0,
      stockAfter: prod.quantity,
      referenceId: 'PROD-9F9177',
      reason: 'Initial inventory listing created',
      actor: 'Vendor',
      metadata: { initialPrice: prod.price, category: prod.category },
      createdAt: prod.createdAt
    });
    console.log('Created inventory history record for Vinayaka Idol');
  }

  process.exit(0);
});

