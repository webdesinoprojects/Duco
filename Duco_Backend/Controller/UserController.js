// Controller/UserController.js
const User = require("../DataBase/Models/UserModel");
const Otp = require("../DataBase/Models/OtpModel");
const sendOtpEmail = require("./sendMail");

// === helpers ===============================================================

const COOLDOWN_SECONDS = 60;

/** Extract a readable error message from SDK/HTTP/library errors */
function extractError(err) {
  // Resend / axios-style
  const nested =
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data;

  const msg =
    nested ||
    err?.message ||
    (typeof err === "string" ? err : null);

  try {
    // include some structure for debugging in Postman
    return msg || JSON.stringify(err, Object.getOwnPropertyNames(err));
  } catch {
    return msg || "Unknown error";
  }
}

// === controllers ===========================================================

// Add address to user's address array
const addAddressToUser = async (req, res) => {
  try {
    const { userId, newAddress } = req.body;

    console.log('📍 Adding address - userId:', userId, 'newAddress:', newAddress);

    if (!userId || !newAddress) {
      return res
        .status(400)
        .json({ ok: false, message: "userId and newAddress are required." });
    }

    // First try to find user by ID
    let userExists = await User.findById(userId);
    console.log('👤 User exists check by ID:', !!userExists, 'userId:', userId);
    
    // If not found by ID, the user ID might be stale - this is a data consistency issue
    if (!userExists) {
      console.log('❌ User not found by ID:', userId);
      console.log('⚠️ User ID does not exist in database. This may indicate:');
      console.log('   1. User was deleted from database');
      console.log('   2. User ID in localStorage is from a different database');
      console.log('   3. Database was reset but localStorage was not cleared');
      
      return res.status(404).json({ 
        ok: false, 
        message: "User not found. Please log in again.",
        hint: "Your session may have expired. Please refresh and log in again."
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { address: newAddress } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    console.log('✅ Address added successfully for user:', userId);
    return res.status(200).json({
      ok: true,
      message: "Address added successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Server error.", error: extractError(error) });
  }
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ ok: false, message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Cooldown: block if an OTP was created within the last 60s for this email
    const recent = await Otp.findOne({
      email,
      createdAt: { $gte: new Date(Date.now() - COOLDOWN_SECONDS * 1000) },
    });
    if (recent) {
      return res.status(429).json({
        ok: false,
        message: `Please wait ${COOLDOWN_SECONDS}s before requesting a new OTP.`,
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });

    // Replace any existing OTPs for this email with a fresh one
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp }); // TTL expiry handled by schema (expires: 300)

    // Send email with OTP (via Resend)
    await sendOtpEmail(email, otp);

    return res.status(200).json({
      ok: true,
      message: "OTP sent successfully",
      userExists: !!user,
    });
  } catch (err) {
    const detail = extractError(err);
    console.error("OTP send error:", detail);
    // Return the real error so you can see it in Postman:
    return res
      .status(500)
      .json({ ok: false, message: "Error sending OTP", error: detail });
  }
};

// Verify OTP and Login/Signup
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ ok: false, message: "Email and OTP are required" });
    }

    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid or expired OTP" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: name || "New User",
        isVerified: true,
      });
    } else {
      user.isVerified = true;
      await user.save();
    }

    // Clean up used OTP(s)
    await Otp.deleteMany({ email });

    return res
      .status(200)
      .json({ ok: true, message: "Login/Signup successful", user });
  } catch (error) {
    const detail = extractError(error);
    console.error("verifyOtp error:", detail);
    return res
      .status(500)
      .json({ ok: false, message: "Server error", error: detail });
  }
};

const getUser = async (req, res) => {
  try {
    // Add pagination to prevent memory issues
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default to 50 users per page
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalUsers = await User.countDocuments();

    const users = await User.find()
      .select('-password') // Exclude password field for security
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ 
      ok: true, 
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    const detail = extractError(error);
    console.error("getUser error:", detail);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: detail });
  }
};

// === exports ===============================================================

module.exports = {
  addAddressToUser,
  sendOtp,
  verifyOtp,
  getUser,
};
