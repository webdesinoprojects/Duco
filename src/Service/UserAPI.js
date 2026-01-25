// src/Service/authService.js
import axios from "axios";

const BASE_URL = "http://localhost:3002/user"; // update with your actual backend base URL

// 1. Send OTP to Gmail
export const sendOtpToEmail = async ({ email }) => {
  const res = await axios.post(`${BASE_URL}/send-otp`, { email });
  return res.data;
};

// 2. Verify OTP and Login/Signup
export const verifyOtpAndLogin = async ({ email, otp, name }) => {
  const res = await axios.post(`${BASE_URL}/verify-otp`, { email, otp, name });
  return res.data;
};

export const addAddressToUser = async ({ userId, address }) => {
  console.log("Adding address for user:", userId, "Address:", address);
  try {
    const response = await axios.post(`${BASE_URL}/add-address`, {
      userId: userId,
      newAddress: address,
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to add address" };
  }
};
