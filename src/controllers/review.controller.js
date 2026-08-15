import Review from "../models/Review.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";

// Helper: recalculate avgRating and numReviews on the Product
async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      avgRating: Math.round(stats[0].avgRating * 10) / 10, // round to 1 decimal
      numReviews: stats[0].numReviews,
    });
  } else {
    // no reviews left
    await Product.findByIdAndUpdate(productId, {
      avgRating: 0,
      numReviews: 0,
    });
  }
}

// To create a review (only for delivered orders)
export async function CreateReview(req, res) {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "productId, orderId and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Verify the order belongs to this user, is delivered, and contains the product
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      orderStatus: "DELIVERED",
      "items.product": productId,
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "You can only review products from your delivered orders",
      });
    }

    // Prevent duplicate review for same user + product
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      order: orderId,
      rating,
      comment,
    });

    await recalculateProductRating(productId);

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: review,
    });
  } catch (err) {
    console.log("Error while creating review", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get all reviews for a product (public)
export async function GetProductReviews(req, res) {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate("user", "userName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
    });
  } catch (err) {
    console.log("Error while fetching reviews", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To update own review
export async function UpdateReview(req, res) {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();
    await recalculateProductRating(review.product);

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (err) {
    console.log("Error while updating review", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To delete own review
export async function DeleteReview(req, res) {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    const productId = review.product;

    await review.deleteOne();
    await recalculateProductRating(productId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    console.log("Error while deleting review", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}