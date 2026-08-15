import Address from "../models/Address.model.js";

// Add a new address
export async function AddAddress(req, res) {
  try {
    const { label, fullName, phone, street, city, state, pincode, isDefault } =
      req.body;

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    // check if this is the user's first address
    const existingCount = await Address.countDocuments({ user: req.user.id });
    const shouldBeDefault = existingCount === 0 ? true : !!isDefault;

    // if this new one is being set as default, unset any existing default
    if (shouldBeDefault) {
      await Address.updateMany(
        { user: req.user.id, isDefault: true },
        { isDefault: false },
      );
    }

    const address = await Address.create({
      user: req.user.id,
      label,
      fullName,
      phone,
      street,
      city,
      state,
      pincode,
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: address,
    });
  } catch (err) {
    console.log("Error while adding address", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// Get all addresses for the logged-in user
export async function GetMyAddresses(req, res) {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      data: addresses,
    });
  } catch (err) {
    console.log("Error while fetching addresses", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// Update an address
export async function UpdateAddress(req, res) {
  try {
    const { label, fullName, phone, street, city, state, pincode, isDefault } =
      req.body;

    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const fieldsToCheck = { fullName, phone, street, city, state, pincode };

    //checks all fields are have data or not
    for (const [key, value] of Object.entries(fieldsToCheck)) { // obje to array of obj[key-val pair]
      if (value !== undefined && !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${key} cannot be empty`,
        });
      }
    }

    // assign new value to existing data.
    if (label !== undefined) address.label = label;
    if (fullName !== undefined) address.fullName = fullName;
    if (phone !== undefined) address.phone = phone;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;

    if (isDefault === true && !address.isDefault) {
      await Address.updateMany(
        { user: req.user.id, isDefault: true },
        { isDefault: false },
      );
      address.isDefault = true;
    }

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (err) {
    console.log("Error while updating address", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// Delete an address
export async function DeleteAddress(req, res) {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = address.isDefault;

    await address.deleteOne();

    // if the deleted one was default, promote another address (if any) to default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user.id }).sort({
        createdAt: -1,
      });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (err) {
    console.log("Error while deleting address", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}

// Set an address as default
export async function SetDefaultAddress(req, res) {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await Address.updateMany(
      { user: req.user.id, isDefault: true },
      { isDefault: false },
    );

    address.isDefault = true;
    await address.save();

    return res.status(200).json({
      success: true,
      message: "Default address updated",
      data: address,
    });
  } catch (err) {
    console.log("Error while setting default address", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}