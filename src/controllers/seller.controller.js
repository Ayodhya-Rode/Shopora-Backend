import sellerModel from "../models/Seller.model.js";
import {isValidEmail,isValidPhone,isValidPassword,} from "../utils/validators.js";
import bcrypt from "bcryptjs";
import {generateAccessToken,generateRefreshToken,} from "../utils/generateToken.js";
import config from "../config/config.js";
import jwt from "jsonwebtoken";


// To register new seller
export async function RegisterSeller(req, res) {
  try {
    const { sellerName, email, password, phoneNumber, shopName } = req.body;

    // checks all mandatory fields
    if (!sellerName|| !email || !password || !phoneNumber || !shopName) {
      return res.status(400).json({
        success: false,
        message: "Seller name, email, phone number, shop name and password are required!",
      });
    }

    // check email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // only check pattern when phone number has provided
    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phonenumber",
      });
    }

    //checks valid password
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters and include both letters and numbers",
      });
    }

    const existingSeller = await sellerModel.findOne({ email });
    if (existingSeller) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Seller already exists with this email",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await sellerModel.create({
      sellerName,
      email,
      password: hashedPassword,
      phoneNumber,
      shopName
    });

    const accessToken = generateAccessToken(seller._id, seller.role);
    const refreshToken = generateRefreshToken(seller._id, seller.role);

    // Refresh token save to DB
    seller.refreshToken = refreshToken;
    await seller.save();

    res.cookie("sellerRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully",
      data: {
        _id: seller._id,
        sellerName: seller.sellerName,
        email: seller.email,
        phoneNumber: seller.phoneNumber,
        role: seller.role,
        shopName: seller.shopName,
      },
      accessToken,
    });
  } catch (err) {
    console.log("Error while Register seller", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}


// To login Seller
export async function LoginSeller(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required!",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    const seller = await sellerModel.findOne({ email }).select("+password +refreshToken");

    const isMatch = await bcrypt.compare(password, seller.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (seller.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your seller account has been blocked. Please contact support.",
      });
    }

    

    const accessToken = generateAccessToken(seller._id, seller.role);
    const refreshToken = generateRefreshToken(seller._id, seller.role);

    seller.refreshToken = refreshToken;
    await seller.save();

    res.cookie("sellerRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: seller._id,
        sellerName: seller.sellerName,
        email: seller.email,
        phoneNumber: seller.phoneNumber,
        role: seller.role,
      },
      accessToken,
    });
  } catch (err) {
    console.log("Error while Login seller", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}


// To generate new access token
export async function RefreshAccessToken(req, res) {
  try {
    const refreshToken = req.cookies.sellerRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found, please login again",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      console.log("JWT Verify Error:", err.message);
      return res.status(403).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const seller = await sellerModel.findById(decoded.id).select("+refreshToken");

    if (!seller || seller.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = generateAccessToken(seller._id, seller.role);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}


//To logout seller
export async function LogoutSeller(req, res) {
  try {
    const refreshToken = req.cookies.sellerRefreshToken;

    if (refreshToken) {
      await sellerModel.findOneAndUpdate(
        { refreshToken },
        { $unset: { refreshToken: "" } },
      );
    }

    res.clearCookie("sellerRefreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.log("Error while logout", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}


//To get logged in user profile 
export async function GetSellerProfile(req, res) {
  try {
    const seller = await sellerModel.findById(req.user.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller profile fetched successfully",
      data: seller,
    });

  } catch (err) {
    console.log("Error while fetching profile", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

export async function UpdateSellerProfile(req, res) {
  try {
    const {
      sellerName,
      phoneNumber,
      shopName,
      shopLogo,
      gstNumber,
      businessAddress,
    } = req.body;

    const fieldsToCheck = { sellerName, phoneNumber, shopName };

    for (const [key, value] of Object.entries(fieldsToCheck)) {
      if (value !== undefined && !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${key} cannot be empty`,
        });
      }
    }

    const updateData = {};
    if (sellerName !== undefined) updateData.sellerName = sellerName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (shopName !== undefined) updateData.shopName = shopName;
    if (shopLogo !== undefined) updateData.shopLogo = shopLogo;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress;

    const updatedSeller = await sellerModel.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedSeller,
    });
  } catch (err) {
    console.log("Error while updating seller profile", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}