const bcrypt = require('bcrypt');
const EmployeesAcc = require('../DataBase/Models/EmployessAcc');
const AdminOtp = require('../DataBase/Models/AdminOtpModel');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to admin email
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if admin exists with this email
    const admin = await EmployeesAcc.findOne({ 'employeesdetails.email': email });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin account found with this email'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Save OTP to database
    await AdminOtp.create({
      email: email.toLowerCase(),
      otp: otp
    });

    // Send OTP via email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'Duco <no-reply@ducoart.com>',
        to: email,
        subject: 'Admin Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${admin.employeesdetails?.name || 'Admin'},</p>
            <p>You have requested to reset your admin password. Please use the following OTP to proceed:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This OTP will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Duco Art - Admin Panel</p>
          </div>
        `
      });

      console.log(`✅ OTP sent to ${email}: ${otp}`);

      res.json({
        success: true,
        message: 'OTP sent successfully to your email'
      });
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }
  } catch (error) {
    console.error('❌ Error in sendOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find the most recent OTP for this email
    const otpRecord = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp: otp,
      verified: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('❌ Error in verifyOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// Reset password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Verify OTP is valid and verified
    const otpRecord = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp: otp,
      verified: true
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unverified OTP. Please verify OTP first.'
      });
    }

    // Find admin account
    const admin = await EmployeesAcc.findOne({ 'employeesdetails.email': email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    admin.password = hashedPassword;
    await admin.save();

    // Delete used OTP
    await AdminOtp.deleteMany({ email: email.toLowerCase() });

    console.log(`✅ Password reset successful for ${email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('❌ Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};
