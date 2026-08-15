import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    sellerName: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone is required"],
    },
    shopName: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    shopLogo: {
      type: String,
      default: "",
    },
    gstNumber: {
      type: String,
      default: "",
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "seller",
      immutable: true,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    
  },
  { timestamps: true },
);

const sellerModel = mongoose.model("sellerModel", sellerSchema);
export default sellerModel;
