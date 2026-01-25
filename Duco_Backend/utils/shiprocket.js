const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

const getShiprocketToken = async () => {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }
  );

  cachedToken = response.data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // ~9 days

  return cachedToken;
};

module.exports = { getShiprocketToken };
