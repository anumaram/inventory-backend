const mongoose = require('mongoose');

async function seedInventoryHistory() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const Product = require('./models/product.model');
  const Order = require('./models/order.model');
  const InventoryHistory = require('./models/inventory-history.model');

  console.log('Clearing old inventory history records...');
  await InventoryHistory.deleteMany({});

  const products = await Product.find({ isDeleted: { $ne: true } }).lean();
  const orders = await Order.find({ isDeleted: { $ne: true } }).lean();

  console.log(`Found ${products.length} products and ${orders.length} orders.`);

  // Map orders to products
  const productOrdersMap = {};
  orders.forEach((ord) => {
    const oId = ord.orderId || `ORD-${String(ord._id).slice(-6).toUpperCase()}`;
    const ordDate = new Date(ord.createdAt || ord.placedAt || Date.now());

    if (Array.isArray(ord.items) && ord.items.length > 0) {
      ord.items.forEach((it) => {
        const pId = String(it.productId?._id || it.productId || '');
        if (pId) {
          if (!productOrdersMap[pId]) productOrdersMap[pId] = [];
          productOrdersMap[pId].push({
            orderId: oId,
            qty: Number(it.qty || 1),
            price: Number(it.price || 0),
            date: ordDate,
            customerName: ord.shippingAddress?.fullName || 'Customer'
          });
        }
      });
    } else if (ord.productId) {
      const pId = String(ord.productId?._id || ord.productId || '');
      if (pId) {
        if (!productOrdersMap[pId]) productOrdersMap[pId] = [];
        productOrdersMap[pId].push({
          orderId: oId,
          qty: Number(ord.qty || 1),
          price: Number(ord.price || 0),
          date: ordDate,
          customerName: ord.shippingAddress?.fullName || 'Customer'
        });
      }
    }
  });

  const historyEntriesToInsert = [];

  for (const prod of products) {
    const pId = String(prod._id);
    const prodOrders = productOrdersMap[pId] || [];
    const currentStock = Number(prod.quantity || 0);

    // Calculate realistic historical timeline backwards from currentStock
    // E.g.: Initial stock + Restocks - Orders = currentStock
    const totalOrderedQty = prodOrders.reduce((s, o) => s + o.qty, 0);

    const baseCreatedDate = new Date(prod.createdAt || Date.now() - 15 * 24 * 60 * 60 * 1000);
    const hasRestock = totalOrderedQty > 5 || currentStock < 10;
    const restockQty = hasRestock ? 10 : 0;
    const initialCreatedStock = Math.max(currentStock + totalOrderedQty - restockQty, currentStock);

    let runningStock = 0;

    // 1. Initial Creation Event
    runningStock = initialCreatedStock;
    historyEntriesToInsert.push({
      productId: prod._id,
      vendorId: prod.userId,
      type: 'PRODUCT_CREATED',
      quantityChange: initialCreatedStock,
      stockBefore: 0,
      stockAfter: initialCreatedStock,
      referenceId: `SKU-${String(prod._id).slice(-6).toUpperCase()}`,
      reason: 'Initial product creation & inventory stock in',
      actor: 'Vendor',
      metadata: {
        category: prod.category,
        initialPrice: prod.price
      },
      createdAt: baseCreatedDate
    });

    // 2. Orders timeline
    prodOrders.sort((a, b) => new Date(a.date) - new Date(b.date));

    let orderIndex = 0;
    for (const ord of prodOrders) {
      const stockBefore = runningStock;
      runningStock = Math.max(0, runningStock - ord.qty);

      historyEntriesToInsert.push({
        productId: prod._id,
        vendorId: prod.userId,
        type: 'ORDER_PLACED',
        quantityChange: -ord.qty,
        stockBefore,
        stockAfter: runningStock,
        referenceId: ord.orderId,
        reason: `Customer purchase (${ord.qty} unit${ord.qty === 1 ? '' : 's'}) by ${ord.customerName}`,
        actor: 'Customer',
        metadata: {
          orderId: ord.orderId,
          itemPrice: ord.price
        },
        createdAt: ord.date
      });
      orderIndex++;

      // Mid-stream restock simulation if applicable
      if (hasRestock && orderIndex === Math.floor(prodOrders.length / 2)) {
        const preRestock = runningStock;
        runningStock += restockQty;
        const restockDate = new Date(ord.date.getTime() + 12 * 60 * 60 * 1000);
        historyEntriesToInsert.push({
          productId: prod._id,
          vendorId: prod.userId,
          type: 'STOCK_ADJUSTMENT',
          quantityChange: restockQty,
          stockBefore: preRestock,
          stockAfter: runningStock,
          referenceId: `RESTOCK-${Math.floor(1000 + Math.random() * 9000)}`,
          reason: `Supplier batch restock (+${restockQty} units)`,
          actor: 'Vendor',
          createdAt: restockDate
        });
      }
    }

    // 3. Final synchronization check if runningStock differs from currentStock
    if (runningStock !== currentStock) {
      const diff = currentStock - runningStock;
      const adjustmentDate = new Date(Date.now() - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000));
      historyEntriesToInsert.push({
        productId: prod._id,
        vendorId: prod.userId,
        type: 'STOCK_ADJUSTMENT',
        quantityChange: diff,
        stockBefore: runningStock,
        stockAfter: currentStock,
        referenceId: `AUDIT-${Math.floor(1000 + Math.random() * 9000)}`,
        reason: diff > 0 ? `Stock audit correction (+${diff})` : `Inventory cycle count adjustment (${diff})`,
        actor: 'Vendor',
        createdAt: adjustmentDate
      });
    }
  }

  console.log(`Inserting ${historyEntriesToInsert.length} audit trail history records...`);
  await InventoryHistory.insertMany(historyEntriesToInsert);
  console.log('Successfully seeded inventory audit histories for all vendor products!');

  const totalHist = await InventoryHistory.countDocuments({});
  console.log(`Total inventory history records in DB: ${totalHist}`);
  process.exit(0);
}

seedInventoryHistory().catch((err) => {
  console.error('Error seeding inventory history:', err);
  process.exit(1);
});

