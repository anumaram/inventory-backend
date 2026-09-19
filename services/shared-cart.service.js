const SharedCart = require('../models/shared-cart.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const crypto = require('crypto');

async function resolveCustomerId(req) {
  let customerId = req.customerId || (req.query && req.query.customerId) || (req.body && req.body.customerId);
  if (!customerId) {
    const anyCustomer = await Customer.findOne({ email: 'jk@gmail.com' }) || await Customer.findOne();
    if (anyCustomer) customerId = anyCustomer._id;
  }
  return customerId;
}

// 1. Get or list user's shared carts (strictly private to creator and members)
exports.getMySharedCarts = async (req, res) => {
  try {
    const customerId = req.customerId || req.query.customerId;
    const memberName = req.query.memberName || (req.customer && req.customer.name);

    if (!customerId && !memberName) {
      return res.json([]);
    }

    const conditions = [];
    if (customerId) {
      conditions.push({ creatorId: customerId });
      conditions.push({ 'members.customerId': customerId });
    }
    if (memberName) {
      conditions.push({ 'members.name': new RegExp(`^${memberName.trim()}$`, 'i') });
    }

    const carts = await SharedCart.find({
      status: { $ne: 'archived' },
      $or: conditions
    })
      .populate('items.productId')
      .sort({ updatedAt: -1 })
      .lean();

    res.json(carts);
  } catch (err) {
    console.error('getMySharedCarts error:', err);
    res.status(500).json({ msg: 'Failed to load shared carts' });
  }
};

// 2. Get specific shared cart by ID or share code
exports.getSharedCart = async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const customerId = req.customerId || req.query.customerId;
    const memberName = req.query.memberName || (req.customer && req.customer.name);

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrCode);
    const codeRegex = new RegExp(`^${idOrCode.trim()}$`, 'i');
    const cart = await SharedCart.findOne({
      $or: [
        { _id: isMongoId ? idOrCode : null },
        { shareCode: codeRegex }
      ]
    }).populate('items.productId');

    if (!cart) {
      return res.status(404).json({ msg: 'Shared cart not found' });
    }

    // Check membership
    let isMember = false;
    if (customerId) {
      isMember = String(cart.creatorId) === String(customerId) ||
        cart.members.some(m => m.customerId && String(m.customerId) === String(customerId));
    }
    if (!isMember && memberName) {
      isMember = cart.members.some(m => m.name && m.name.toLowerCase() === memberName.trim().toLowerCase());
    }

    const cartObj = cart.toObject();
    cartObj.isMember = isMember;

    res.json(cartObj);
  } catch (err) {
    console.error('getSharedCart error:', err);
    res.status(500).json({ msg: 'Failed to fetch shared cart' });
  }
};

// 3. Create a new shared cart
exports.createSharedCart = async (req, res) => {
  try {
    const customerId = await resolveCustomerId(req);
    const {
      name = 'Family Cart',
      template = 'trip',
      creatorName = (req.customer?.name || 'You'),
      targetBudget = 0,
      memberAccess = 'full'
    } = req.body;

    const shareCode = `CART-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const cleanTemplate = (template || 'trip').toString().toLowerCase();

    const cart = await SharedCart.create({
      name,
      creatorId: customerId,
      creatorName,
      shareCode,
      template: cleanTemplate,
      targetBudget: Number(targetBudget) || 0,
      memberAccess,
      members: [
        {
          customerId: customerId || null,
          name: creatorName,
          role: 'creator',
          isReady: true,
          joinedAt: new Date()
        }
      ],
      items: [],
      messages: [
        {
          senderName: 'System',
          text: `Welcome to "${name}"! Share the code ${shareCode} to invite friends and collaborate.`,
          createdAt: new Date()
        }
      ],
      activityLog: [
        {
          action: 'created',
          userName: creatorName,
          details: `Created new group cart "${name}"`,
          createdAt: new Date()
        }
      ]
    });

    await cart.populate('items.productId');
    const cartObj = cart.toObject();
    cartObj.isMember = true;
    res.status(201).json(cartObj);
  } catch (err) {
    console.error('createSharedCart error:', err);
    res.status(500).json({ msg: 'Failed to create shared cart' });
  }
};

// 4. Join an existing shared cart
exports.joinSharedCart = async (req, res) => {
  try {
    const customerId = req.customerId || req.body.customerId;
    const { shareCode, memberName = (req.customer?.name || 'Friend') } = req.body;

    if (!shareCode) {
      return res.status(400).json({ msg: 'Share code is required' });
    }

    const cleanCode = shareCode.trim();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanCode);

    const cart = await SharedCart.findOne({
      $or: [
        { shareCode: new RegExp(`^${cleanCode}$`, 'i') },
        { _id: isMongoId ? cleanCode : null }
      ]
    });

    if (!cart) {
      return res.status(404).json({ msg: 'Invalid shared cart code or cart not found' });
    }

    const cleanName = (memberName || (req.customer && req.customer.name) || 'Friend').trim();

    const existingMember = cart.members.find(
      (m) => (customerId && m.customerId && String(m.customerId) === String(customerId)) ||
             (m.name && m.name.toLowerCase() === cleanName.toLowerCase())
    );

    if (!existingMember) {
      cart.members.push({
        customerId: customerId || null,
        name: cleanName,
        role: 'member',
        isReady: false,
        joinedAt: new Date()
      });

      cart.messages.push({
        senderName: 'System',
        text: `${cleanName} joined the shared cart 🎉`,
        createdAt: new Date()
      });

      cart.activityLog.push({
        action: 'joined',
        userName: cleanName,
        details: `${cleanName} joined the group cart`,
        createdAt: new Date()
      });

      await cart.save();
    } else if (customerId && !existingMember.customerId) {
      existingMember.customerId = customerId;
      await cart.save();
    }

    await cart.populate('items.productId');
    const cartObj = cart.toObject();
    cartObj.isMember = true;
    res.json(cartObj);
  } catch (err) {
    console.error('joinSharedCart error:', err);
    res.status(500).json({ msg: 'Failed to join shared cart' });
  }
};

// 5. Add product to shared cart
exports.addItemToCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { productId, quantity = 1, memberName = 'Member' } = req.body;
    const customerId = req.customerId || req.body.customerId;

    const cart = await SharedCart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ msg: 'Shared cart not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    const img = product.image || (product.images && product.images[0]) || '';

    // Check if item already in cart
    const existingItem = cart.items.find((i) => String(i.productId) === String(productId));
    if (existingItem) {
      existingItem.quantity += Number(quantity) || 1;
      existingItem.name = product.name;
      existingItem.image = img;
      existingItem.price = product.price;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        image: img,
        price: product.price,
        vendorName: product.vendorName || 'JK Retail',
        quantity: Number(quantity) || 1,
        addedBy: { customerId: customerId || null, name: memberName },
        votes: [
          { customerId: customerId || null, customerName: memberName, vote: 'up' }
        ],
        comments: []
      });
    }

    cart.messages.push({
      senderId: customerId || null,
      senderName: memberName,
      text: `I added "${product.name}". Please vote!`,
      productId: product._id,
      productPreview: {
        name: product.name,
        price: product.price,
        image: img
      },
      createdAt: new Date()
    });

    cart.activityLog.push({
      action: 'item_added',
      userName: memberName,
      details: `Added "${product.name}" (₹${product.price})`,
      createdAt: new Date()
    });

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('addItemToCart error:', err);
    res.status(500).json({ msg: 'Failed to add item to cart' });
  }
};

// 6. Cast Vote on Item (up, down, unsure, agree, disagree)
exports.voteOnItem = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    let { vote = 'up', memberName = 'Member' } = req.body;
    const customerId = req.customerId || req.body.customerId;

    // Normalize vote value
    if (vote === 'agree') vote = 'up';
    if (vote === 'disagree') vote = 'down';

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ msg: 'Item not found in cart' });

    const existingVote = item.votes.find(
      (v) => (customerId && String(v.customerId) === String(customerId)) || (v.customerName === memberName)
    );

    if (existingVote) {
      existingVote.vote = vote;
    } else {
      item.votes.push({ customerId: customerId || null, customerName: memberName, vote });
    }

    cart.activityLog.push({
      action: 'vote',
      userName: memberName,
      details: `Voted ${vote === 'up' ? '👍 Agree' : '👎 Disagree'} on "${item.name}"`,
      createdAt: new Date()
    });

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('voteOnItem error:', err);
    res.status(500).json({ msg: 'Failed to cast vote' });
  }
};

// 7. Add Comment to Item
exports.addCommentToItem = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const text = req.body.text || req.body.comment;
    const { memberName = 'Member' } = req.body;
    const customerId = req.customerId || req.body.customerId;

    if (!text || !text.trim()) return res.status(400).json({ msg: 'Comment text required' });

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    item.comments.push({
      customerId: customerId || null,
      customerName: memberName,
      text: text.trim(),
      createdAt: new Date()
    });

    cart.activityLog.push({
      action: 'comment',
      userName: memberName,
      details: `Commented on "${item.name}": "${text.trim().substring(0, 50)}${text.trim().length > 50 ? '...' : ''}"`,
      createdAt: new Date()
    });

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('addCommentToItem error:', err);
    res.status(500).json({ msg: 'Failed to post comment' });
  }
};

// 8. Post Discussion Chat Message
exports.postMessage = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { text, memberName = 'Member', productId } = req.body;
    const customerId = req.customerId || req.body.customerId;

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    let productPreview = null;
    if (productId) {
      const prod = await Product.findById(productId);
      if (prod) {
        productPreview = {
          name: prod.name,
          price: prod.price,
          image: prod.image || (prod.images && prod.images[0]) || ''
        };
      }
    }

    cart.messages.push({
      senderId: customerId || null,
      senderName: memberName,
      text: text || '',
      productId: productId || null,
      productPreview,
      createdAt: new Date()
    });

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('postMessage error:', err);
    res.status(500).json({ msg: 'Failed to post message' });
  }
};

// 9. Toggle Ready for Checkout Status
exports.toggleReadyStatus = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { memberName = 'Member', isReady } = req.body;
    const customerId = req.customerId || req.body.customerId;

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    let member = cart.members.find(
      (m) => (customerId && String(m.customerId) === String(customerId)) || m.name.toLowerCase() === memberName.toLowerCase()
    );

    if (!member && cart.members.length > 0) {
      member = cart.members[0];
    }

    if (member) {
      member.isReady = typeof isReady === 'boolean' ? isReady : !member.isReady;

      cart.activityLog.push({
        action: 'ready_toggle',
        userName: member.name,
        details: `${member.name} marked ${member.isReady ? '✅ Ready to Order' : '⏳ Still Deciding'}`,
        createdAt: new Date()
      });

      await cart.save();
    }

    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('toggleReadyStatus error:', err);
    res.status(500).json({ msg: 'Failed to update readiness status' });
  }
};

// 10. Remove Item from Shared Cart
exports.removeItemFromCart = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const { memberName = 'Member' } = req.body;

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    const item = cart.items.id(itemId);
    const itemName = item ? item.name : 'an item';

    cart.items.pull(itemId);

    cart.activityLog.push({
      action: 'item_removed',
      userName: memberName,
      details: `Removed "${itemName}" from shared cart`,
      createdAt: new Date()
    });

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('removeItemFromCart error:', err);
    res.status(500).json({ msg: 'Failed to remove item' });
  }
};

// 11. Update Item Quantity in Shared Cart
exports.updateItemQuantity = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const { quantity, memberName = 'Member' } = req.body;

    const cart = await SharedCart.findById(cartId);
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ msg: 'Item not found in cart' });

    if (quantity <= 0) {
      cart.items.pull(itemId);
    } else {
      item.quantity = Number(quantity);
    }

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('updateItemQuantity error:', err);
    res.status(500).json({ msg: 'Failed to update item quantity' });
  }
};

