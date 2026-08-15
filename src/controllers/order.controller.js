import Order from "../models/Order.model.js";
import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import razorpayInstance from "../utils/razorpay.js";
import crypto from "crypto";

const STATUS_FLOW = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

// To place order from cart
export async function PlaceOrder(req, res) {
  try {
    const {
      shippingAddress,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "shippingAddress and paymentMethod are required",
      });
    }

    let paymentStatus = "PENDING";

    if (paymentMethod === "ONLINE") {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message:
            "Payment verification details are required for online payment",
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
      }

      paymentStatus = "PAID";
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const orderItems = [];
    let itemsTotal = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: `Product not available: ${item.product?.name || item.product}`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      orderItems.push({
        product: product._id,
        seller: product.seller,
        name: product.name,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
      });

      itemsTotal += item.price * item.quantity;
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      itemsTotal,
      totalAmount: itemsTotal,
    });

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (err) {
    console.log("Error while placing order", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get logged in user's orders
export async function GetMyOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (err) {
    console.log("Error while fetching orders", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get single order by id
export async function GetOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (err) {
    console.log("Error while fetching order", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To cancel an order
export async function CancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }

    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled at status: ${order.orderStatus}`,
      });
    }

    order.orderStatus = "CANCELLED";
    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (err) {
    console.log("Error while cancelling order", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get orders containing this seller's products (with filter + search)
export async function GetSellerOrders(req, res) {
  try {
    const { status, search } = req.query;

    const query = { "items.seller": req.user.id };

    if (status) {
      query.orderStatus = status;
    }

    let orders = await Order.find(query)
      .populate("user", "userName email phoneNumber")
      .sort({ createdAt: -1 });

    // Only show this seller's own items within each order

    orders = orders.map((order) => {
      const sellerItems = order.items.filter(
        (item) => item.seller.toString() === req.user.id,
      );

      const sellerTotal = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      return {
        _id: order._id,
        user: order.user,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        items: sellerItems,
        sellerTotal,
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      orders = orders.filter(
        (order) =>
          order._id.toString().toLowerCase().includes(searchLower) ||
          order.items.some((item) =>
            item.name.toLowerCase().includes(searchLower),
          ) ||
          order.user?.userName?.toLowerCase().includes(searchLower),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Seller orders fetched successfully",
      data: orders,
    });
  } catch (err) {
    console.log("Error while fetching seller orders", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To update order status (seller side) — status can only move forward
export async function UpdateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!orderStatus || !STATUS_FLOW.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `orderStatus must be one of: ${STATUS_FLOW.join(", ")}`,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Confirm this order actually contains a product from this seller
    const hasSellerItem = order.items.some(
      (item) => item.seller.toString() === req.user.id,
    );

    if (!hasSellerItem) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a cancelled order",
      });
    }

    if (order.orderStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Order already delivered",
      });
    }

    const currentIndex = STATUS_FLOW.indexOf(order.orderStatus);
    const newIndex = STATUS_FLOW.indexOf(orderStatus);

    if (newIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order status from ${order.orderStatus} to ${orderStatus}`,
      });
    }

    order.orderStatus = orderStatus;

    if (orderStatus === "DELIVERED") {
      order.deliveredAt = new Date();
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (err) {
    console.log("Error while updating order status", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To create a Razorpay order for the current cart total (before placing the actual order)
export async function CreatePaymentOrder(req, res) {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    //total amount of order
    let itemsTotal = 0;
    for (const item of cart.items) {
      itemsTotal += item.price * item.quantity;
    }

    // Create payment order in smallest unit(paise)
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(itemsTotal * 100), //convert amount into smallest unit [Rs ->paise]
      currency: "INR",
      receipt: `receipt_${req.user.id}_${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      message: "Payment order created successfully",
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.log("Error while creating payment order", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// Get sales analytics for logged-in seller
export async function GetSellerSalesAnalytics(req, res) {
  try {
    const { period = "30days" } = req.query;

    const periodDays = {
      "7days": 7,
      "30days": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
    };

    const days = periodDays[period];

    if (!days) {
      return res.status(400).json({
        success: false,
        message: "Invalid period",
      });
    }

    // Consistent local-date key, avoids UTC/local mismatch
    const toDateKey = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const orders = await Order.find({
      "items.seller": req.user.id,
      orderStatus: "DELIVERED",
      createdAt: { $gte: startDate },
    }).select("items createdAt");

    const salesByDate = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateKey = toDateKey(date);

      salesByDate[dateKey] = {
        date: dateKey,
        sales: 0,
        orders: 0,
        productsSold: 0,
      };
    }

    for (const order of orders) {
      const dateKey = toDateKey(order.createdAt);

      const sellerItems = order.items.filter(
        (item) => item.seller.toString() === req.user.id,
      );

      if (!salesByDate[dateKey]) continue;

      let sellerTotal = 0;
      let productsSold = 0;

      for (const item of sellerItems) {
        sellerTotal += item.price * item.quantity;
        productsSold += item.quantity;
      }

      salesByDate[dateKey].sales += sellerTotal;
      salesByDate[dateKey].orders += 1;
      salesByDate[dateKey].productsSold += productsSold;
    }

    return res.status(200).json({
      success: true,
      message: "Seller sales analytics fetched successfully",
      data: Object.values(salesByDate),
    });
  } catch (err) {
    console.log("Error while fetching seller sales analytics", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}
