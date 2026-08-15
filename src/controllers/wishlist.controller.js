import User from "../models/User.model.js";
import Product from "../models/Product.model.js";

// To add product to wishlist
export async function AddToWishlist(req, res) {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await User.findById(req.user.id);

    const alreadyExists = user.wishlist.some(
      (id) => id.toString() === productId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    user.wishlist.push(productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: user.wishlist,
    });
  } catch (err) {
    console.log("Error while adding to wishlist", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To remove product from wishlist
export async function RemoveFromWishlist(req, res) {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: user.wishlist,
    });
  } catch (err) {
    console.log("Error while removing from wishlist", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get user's wishlist (populated with product details)
export async function GetWishlist(req, res) {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "wishlist",
      populate: { path: "category", select: "name" },
    });

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: user.wishlist,
    });
  } catch (err) {
    console.log("Error while fetching wishlist", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}