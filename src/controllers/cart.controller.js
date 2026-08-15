import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";

// Computes the actual price to charge: price minus discountPrice (if any)
function getFinalPrice(product) {
  if (product.discountPrice && product.discountPrice > 0) {
    return product.price - product.discountPrice;
  }
  return product.price;
}

// To add item to cart
export async function AddToCart(req, res) {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} in stock`,
        });
      }

      cart = await Cart.create({
        user: req.user.id,
        items: [
          {
            product: productId,
            quantity,
            size,
            color,
           price: getFinalPrice(product),
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: "Item added to cart successfully",
        data: cart,
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    const totalQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (product.stock < totalQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} in stock`,
      });
    }

    if (existingItem) {
      existingItem.quantity = totalQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        size,
        color,
       price: getFinalPrice(product),
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart,
    });
  } catch (err) {
    console.log("Error while adding item to cart", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get logged in user's cart
export async function GetCart(req, res) {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
      "name images price discountPrice stock"
    );

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: { user: req.user.id, items: [] },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: cart,
    });
  } catch (err) {
    console.log("Error while fetching cart", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To update quantity of a cart item
export async function UpdateCartItem(req, res) {
  try {
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "itemId and quantity are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const product = await Product.findById(item.product);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not available",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} in stock`,
      });
    }

    item.quantity = quantity;
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: cart,
    });
  } catch (err) {
    console.log("Error while updating cart item", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To remove an item from cart
export async function RemoveCartItem(req, res) {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "itemId is required",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    item.deleteOne();
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: cart,
    });
  } catch (err) {
    console.log("Error while removing cart item", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To clear entire cart
export async function ClearCart(req, res) {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart || { user: req.user.id, items: [] },
    });
  } catch (err) {
    console.log("Error while clearing cart", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}