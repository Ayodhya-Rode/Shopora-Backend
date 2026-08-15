import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import imagekit from "../config/imagekit.js";

export async function CreateProduct(req, res) {
  try {
    const {
      name,
      description,
      brand,
      category,
      price,
      discountPrice,
      images,
      sizes,
      colors,
      stock,
    } = req.body;

    // Required fields
   if (!name || !description || !category || price === undefined || !brand) {
      return res.status(400).json({
        success: false,
        message: "Name, description, brand, category and price are required",
      });
    }

    // Required: at least 1 image
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }

    // Required: stock
    const numericStock = Number(stock);
    if (stock === undefined || isNaN(numericStock) || numericStock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Stock is required and must be greater than 0",
      });
    }

    // Required: sizes (must be a valid non-empty JSON array)
    let parsedSizes;
    try {
      parsedSizes = sizes ? JSON.parse(sizes) : [];
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "sizes must be a valid JSON array",
      });
    }
    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one size is required",
      });
    }

    // Required: colors (must be a valid non-empty JSON array)
    let parsedColors;
    try {
      parsedColors = colors ? JSON.parse(colors) : [];
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "colors must be a valid JSON array",
      });
    }
    if (!Array.isArray(parsedColors) || parsedColors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one color is required",
      });
    }

    // discountPrice is the AMOUNT to subtract from price, not the final price
    const numericPrice = Number(price);
    const numericDiscount =
      discountPrice !== undefined ? Number(discountPrice) : undefined;

    if (
      numericDiscount !== undefined &&
      (isNaN(numericDiscount) || numericDiscount >= numericPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount amount must be less than the price",
      });
    }

    // Check category exists
    const existingCategory = await Category.findById(category);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    // Upload images to ImageKit
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      imageUrls = await Promise.all(
        req.files.map(async (file) => {
          const result = await imagekit.upload({
            file: file.buffer,
            fileName: `${Date.now()}-${file.originalname}`,
            folder: "/ecommerce/products",
          });

          return {
            url: result.url,
            fileId: result.fileId,
          };
        }),
      );
    }

    console.log("IMAGE URLS:", imageUrls);

    // Create product
    const product = await Product.create({
      name,
      description,
      brand,
      category,
      price: numericPrice,
      seller: req.user.id,
      discountPrice: numericDiscount,
      images: imageUrls,
      sizes: sizes ? JSON.parse(sizes) : [],
      colors: colors ? JSON.parse(colors) : [],
      stock: stock || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (err) {
    console.log("Error while creating product", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function GetAllProducts(req, res) {
  try {
    const { search } = req.query;

    const query = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");

      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (err) {
    console.log("Error while fetching products", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function GetProductById(req, res) {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (err) {
    console.log("Error while fetching product", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function UpdateProduct(req, res) {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      brand,
      category,
      price,
      discountPrice,
      sizes,
      colors,
      stock,
      isActive,
      removeImages,
    } = req.body;

    // Find product
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check product belongs to logged-in seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this product",
      });
    }

    // Check category exists
    if (category !== undefined) {
      const existingCategory = await Category.findById(category);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    // ---------------------------------------
    // Existing images
    // ---------------------------------------

    let imageUrls = [...product.images];

    // ---------------------------------------
    // Remove old images
    // ---------------------------------------

    if (removeImages) {
      let imagesToRemove;

      try {
        imagesToRemove = JSON.parse(removeImages);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "removeImages must be a valid JSON array",
        });
      }

      if (!Array.isArray(imagesToRemove)) {
        return res.status(400).json({
          success: false,
          message: "removeImages must be an array",
        });
      }

      // Only remove images that belong to this product
      const validFileIds = product.images
        .filter((image) => imagesToRemove.includes(image.fileId))
        .map((image) => image.fileId);

      // Delete from ImageKit
      for (const fileId of validFileIds) {
        await imagekit.deleteFile(fileId);
      }

      // Remove from MongoDB array
      imageUrls = imageUrls.filter(
        (image) => !validFileIds.includes(image.fileId),
      );
    }

    // ---------------------------------------
    // Upload new images
    // ---------------------------------------

    if (req.files && req.files.length > 0) {
      const newImageUrls = await Promise.all(
        req.files.map(async (file) => {
          const result = await imagekit.upload({
            file: file.buffer,
            fileName: `${Date.now()}-${file.originalname}`,
            folder: "/ecommerce/products",
          });

          return {
            url: result.url,
            fileId: result.fileId,
          };
        }),
      );

      // Existing images + new images
      imageUrls = [...imageUrls, ...newImageUrls];
    }

    // ---------------------------------------
    // Prepare update data
    // ---------------------------------------

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (brand !== undefined) {
      updateData.brand = brand;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (price !== undefined) {
      updateData.price = price;
    }

    if (discountPrice !== undefined) {
      const numericDiscount = Number(discountPrice);
      const effectivePrice = Number(
        price !== undefined ? price : product.price,
      );

      if (isNaN(numericDiscount) || numericDiscount >= effectivePrice) {
        return res.status(400).json({
          success: false,
          message: "Discount amount must be less than the price",
        });
      }

      updateData.discountPrice = numericDiscount;
    }

    if (sizes !== undefined) {
      try {
        updateData.sizes = JSON.parse(sizes);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "sizes must be a valid JSON array",
        });
      }
    }

    if (colors !== undefined) {
      try {
        updateData.colors = JSON.parse(colors);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "colors must be a valid JSON array",
        });
      }
    }

    if (stock !== undefined) {
      updateData.stock = stock;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive === true || isActive === "true";
    }

    // Update images only when image operation happened
    if (removeImages !== undefined || (req.files && req.files.length > 0)) {
      updateData.images = imageUrls;
    }

    // ---------------------------------------
    // Update product
    // ---------------------------------------

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    console.log("Error while updating product", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function DeleteProduct(req, res) {
  try {
    const { id } = req.params;

    // 1. Find product
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Check product belongs to logged-in seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this product",
      });
    }

    // 3. Delete product images from ImageKit
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await imagekit.deleteFile(image.fileId);
      }
    }

    // 4. Delete product from MongoDB
    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.log("Error while deleting product", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function GetProductsByCategory(req, res) {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subCategories = await Category.find({
      parentCategory: category._id,
    }).select("_id");

    const categoryIds = [category._id, ...subCategories.map((sub) => sub._id)];

    const products = await Product.find({
      category: { $in: categoryIds },
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (err) {
    console.log("Error while fetching products by category", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function GetMyProducts(req, res) {
  try {
    const products = await Product.find({ seller: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (err) {
    console.log("Error while fetching seller products", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}


export async function GetRecommendedProducts(req, res) {
  try {
    const { id } = req.params;      //id of currently viewing product

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const minPrice = product.price * 0.7;   //below 30%
    const maxPrice = product.price * 1.3;   //above 30%

    // fetch same category products
    let recommendations = await Product.find({
      _id: { $ne: product._id },      // give product whos id is not equal to this id
      category: product.category,     //same category
      isActive: true,
      price: { $gte: minPrice, $lte: maxPrice },
    })
      .select("name brand price discountPrice images stock avgRating numReviews")
      .limit(6);

    // Fallback: if too few matches, widen to just same category (drop price filter)
    if (recommendations.length < 4) {
      recommendations = await Product.find({
        _id: { $ne: product._id },
        category: product.category,
        isActive: true,
      })
        .select("name brand price discountPrice images stock avgRating numReviews")
        .limit(6);
    }

    return res.status(200).json({
      success: true,
      message: "Recommended products fetched successfully",
      data: recommendations,
    });
  } catch (err) {
    console.log("Error while fetching recommended products", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}