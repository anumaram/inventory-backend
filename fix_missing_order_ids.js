const mongoose = require('mongoose');
const { generateOrderId } = require('./utils/orderId.util');
const { generateInvoiceId } = require('./utils/invoiceId.util');

async function fixMissingOrderIds() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
    console.log('Connected to MongoDB');

    const ordersCol = mongoose.connection.db.collection('orders');
    const allOrders = await ordersCol.find({}).toArray();
    console.log(`Total orders in DB: ${allOrders.length}`);

    const existingOrderIds = new Set();
    const existingInvoiceIds = new Set();

    allOrders.forEach((ord) => {
      if (ord.orderId && typeof ord.orderId === 'string' && ord.orderId.startsWith('ORD')) {
        existingOrderIds.add(ord.orderId);
      }
      if (ord.invoiceId && typeof ord.invoiceId === 'string') {
        existingInvoiceIds.add(ord.invoiceId);
      }
    });

    let updatedCount = 0;

    for (let i = 0; i < allOrders.length; i++) {
      const ord = allOrders[i];
      const updates = {};

      if (!ord.orderId || typeof ord.orderId !== 'string' || !ord.orderId.startsWith('ORD')) {
        const orderDate = ord.placedAt || ord.createdAt || ord._id.getTimestamp() || new Date();
        let seq = i + 1;
        let newOrderId = generateOrderId(new Date(orderDate), seq);

        while (existingOrderIds.has(newOrderId)) {
          seq++;
          newOrderId = generateOrderId(new Date(orderDate), seq);
        }

        updates.orderId = newOrderId;
        existingOrderIds.add(newOrderId);
      }

      const effectiveOrderId = updates.orderId || ord.orderId;

      if (!ord.invoiceId || typeof ord.invoiceId !== 'string' || !ord.invoiceId.startsWith('INV-') || ord.invoiceId.startsWith('INV--')) {
        const cleanOrdNum = effectiveOrderId ? effectiveOrderId.replace(/^ORD-?/, '') : generateInvoiceId(new Date(ord.createdAt || Date.now())).replace(/^INV-/, '');
        let newInvoiceId = `INV-${cleanOrdNum}`;
        let seq = 1;
        while (existingInvoiceIds.has(newInvoiceId)) {
          newInvoiceId = `INV-${cleanOrdNum}-${seq}`;
          seq++;
        }
        updates.invoiceId = newInvoiceId;
        existingInvoiceIds.add(newInvoiceId);
      }

      if (Object.keys(updates).length > 0) {
        await ordersCol.updateOne({ _id: ord._id }, { $set: updates });
        updatedCount++;
        console.log(`[UPDATED] Order ${ord._id} -> OrderID: ${updates.orderId || ord.orderId}, InvoiceID: ${updates.invoiceId || ord.invoiceId}`);
      }
    }

    console.log(`\nDONE: Successfully updated ${updatedCount} orders with new orderId and invoiceId.`);
    process.exit(0);
  } catch (err) {
    console.error('Error in fixMissingOrderIds:', err);
    process.exit(1);
  }
}

fixMissingOrderIds();
