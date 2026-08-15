import adminModel from "../models/Admin.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import {
  isValidEmail,
  isValidPassword,
} from "../utils/validators.js";
import bcrypt from "bcryptjs";
import config from "../config/config.js";
import jwt from "jsonwebtoken"
import sellerModel from "../models/Seller.model.js";

// To register Admin
export const RegisterAdmin = async (req, res) => {
  try {
    const { adminName, email, password } = req.body;

    if (!adminName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "adminName, email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters and include both letters and numbers",
      });
    }

    const existingAdmin = await adminModel.findOne({ email });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await adminModel.create({
      adminName,
      email,
      password: hashedPassword,
    });

    const accessToken = generateAccessToken(admin._id, admin.role);
    const refreshToken = generateRefreshToken(admin._id, admin.role);

    admin.refreshToken = refreshToken;
    await admin.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        _id: admin._id,
        adminName: admin.adminName,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
    });
  } catch (err) {
    console.log("Error while Register admin", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


// To Login Admin
export async function LoginAdmin(req, res) {
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

    const admin = await adminModel.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken(admin._id, admin.role);
    const refreshToken = generateRefreshToken(admin._id, admin.role);

    admin.refreshToken = refreshToken;
    await admin.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged in successfully",
      data: {
        _id: admin._id,
        adminName: admin.adminName,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
    });
  } catch (err) {
    console.log("Error while Login admin", err);

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
    const refreshToken = req.cookies.refreshToken;

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

    const admin = await adminModel
      .findById(decoded.id)
      .select("+refreshToken");

    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = generateAccessToken(admin._id,admin.role);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    console.log("Error while refreshing admin access token", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

//To Logout Admin

export async function LogoutAdmin(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await adminModel.findOneAndUpdate(
        { refreshToken },
        { $unset: { refreshToken: "" } }
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.log("Error while logout admin", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get logged in Admin profile
export async function GetAdminProfile(req, res) {
  try {
    const admin = await adminModel.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin profile fetched successfully",
      data: admin,
    });
  } catch (err) {
    console.log("Error while fetching admin profile", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To get all sellers (admin)
export async function GetAllSellers(req, res) {
  try {
    const sellers = await sellerModel
      .find()
      .select("-refreshToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Sellers fetched successfully",
      data: sellers,
    });
  } catch (err) {
    console.log("Error while fetching sellers", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To block a seller (admin)
export async function BlockSeller(req, res) {
  try {
    const { id } = req.params;

    const seller = await sellerModel.findById(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    seller.isBlocked = true;
    await seller.save();

    return res.status(200).json({
      success: true,
      message: "Seller blocked successfully",
      data: seller,
    });
  } catch (err) {
    console.log("Error while blocking seller", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// To unblock a seller (admin)
export async function UnblockSeller(req, res) {
  try {
    const { id } = req.params;

    const seller = await sellerModel.findById(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    seller.isBlocked = false;
    await seller.save();

    return res.status(200).json({
      success: true,
      message: "Seller unblocked successfully",
      data: seller,
    });
  } catch (err) {
    console.log("Error while unblocking seller", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}