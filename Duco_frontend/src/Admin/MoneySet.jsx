import React, { useState, useEffect } from "react";
import { createOrUpdatePrice, fetchAllPrices } from "../Service/APIservice";

const MoneySet = () => {
  const [location, setLocation] = useState("");
  const [aliases, setAliases] = useState("");
  const [priceIncrease, setPriceIncrease] = useState("");
  const [currencyCountry, setCurrencyCountry] = useState("");
  const [currencyConvert, setCurrencyConvert] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPrices();
      setEntries(data);
    } catch (err) {
      console.error(err);
      setMessage("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setLocation(entry.location);
    setAliases(entry.aliases?.join(", ") || "");
    setPriceIncrease(entry.price_increase.toString());
    setCurrencyCountry(entry.currency?.country || "");
    setCurrencyConvert(entry.currency?.toconvert?.toString() || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setLocation("");
    setAliases("");
    setPriceIncrease("");
    setCurrencyCountry("");
    setCurrencyConvert("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("🚀 Submit clicked with values:", {
      location,
      aliases,
      priceIncrease,
      currencyCountry,
      currencyConvert,
    });

    // ✅ Validation
    if (!location || location.trim() === "") {
      setMessage("Location name is required");
      return;
    }

    if (priceIncrease === "" || isNaN(priceIncrease) || priceIncrease < 0) {
      setMessage("Price Increase must be a valid number >= 0");
      return;
    }

    if (!currencyCountry || currencyCountry.trim() === "") {
      setMessage("Currency code is required");
      return;
    }

    if (!currencyConvert || isNaN(currencyConvert) || currencyConvert <= 0) {
      setMessage("Conversion rate must be a valid number > 0");
      return;
    }

    // ✅ Check for duplicate locations (if creating new entry)
    if (!editingEntry) {
      const isDuplicate = entries.some(entry => 
        entry.location.toLowerCase() === location.toLowerCase()
      );
      if (isDuplicate) {
        setMessage("A location with this name already exists. Use Edit to modify it.");
        return;
      }
    }

    // ✅ Check for duplicate aliases
    const aliasArray = aliases
      ? aliases.split(",").map((a) => a.trim().toLowerCase()).filter(a => a)
      : [];
    
    const hasDuplicateAlias = entries.some(entry => {
      if (editingEntry && entry.location === editingEntry.location) return false; // Skip self
      const entryAliases = (entry.aliases || []).map(a => a.toLowerCase());
      return aliasArray.some(alias => entryAliases.includes(alias));
    });

    if (hasDuplicateAlias) {
      setMessage("One or more aliases already exist in other locations");
      return;
    }

    try {
      const result = await createOrUpdatePrice({
        location,
        price_increase: Number(priceIncrease),
        currency: {
          country: currencyCountry,
          toconvert: Number(currencyConvert),
        },
        aliases: aliasArray,
      });
      console.log("✅ API Response:", result);

      setMessage(result.message || (editingEntry ? "Entry updated successfully!" : "Entry created successfully!"));
      setLocation("");
      setAliases("");
      setPriceIncrease("");
      setCurrencyCountry("");
      setCurrencyConvert("");
      setEditingEntry(null);
      fetchPrices();
    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.response?.data?.message || err.message || "Failed to save data"}`);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Filter entries based on search
  const filteredEntries = entries.filter(entry => 
    entry.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entry.currency?.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Comprehensive list of all countries with their currencies
  const countryOptions = [
    { country: 'Afghanistan', code: 'AFN', name: 'Afghan Afghani', rate: 1.55 },
    { country: 'Albania', code: 'ALL', name: 'Albanian Lek', rate: 1.28 },
    { country: 'Algeria', code: 'DZD', name: 'Algerian Dinar', rate: 1.62 },
    { country: 'Andorra', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Angola', code: 'AOA', name: 'Angolan Kwanza', rate: 8.5 },
    { country: 'Antigua and Barbuda', code: 'XCD', name: 'East Caribbean Dollar', rate: 0.032 },
    { country: 'Argentina', code: 'ARS', name: 'Argentine Peso', rate: 0.11 },
    { country: 'Armenia', code: 'AMD', name: 'Armenian Dram', rate: 4.7 },
    { country: 'Australia', code: 'AUD', name: 'Australian Dollar', rate: 0.018 },
    { country: 'Austria', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Azerbaijan', code: 'AZN', name: 'Azerbaijani Manat', rate: 0.020 },
    { country: 'Bahamas', code: 'BSD', name: 'Bahamian Dollar', rate: 0.012 },
    { country: 'Bahrain', code: 'BHD', name: 'Bahraini Dinar', rate: 0.0045 },
    { country: 'Bangladesh', code: 'BDT', name: 'Bangladeshi Taka', rate: 1.25 },
    { country: 'Barbados', code: 'BBD', name: 'Barbadian Dollar', rate: 0.024 },
    { country: 'Belarus', code: 'BYN', name: 'Belarusian Ruble', rate: 0.039 },
    { country: 'Belgium', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Belize', code: 'BZD', name: 'Belize Dollar', rate: 0.024 },
    { country: 'Benin', code: 'XOF', name: 'West African CFA Franc', rate: 7.2 },
    { country: 'Bhutan', code: 'BTN', name: 'Bhutanese Ngultrum', rate: 1.0 },
    { country: 'Bolivia', code: 'BOB', name: 'Bolivian Boliviano', rate: 0.084 },
    { country: 'Bosnia and Herzegovina', code: 'BAM', name: 'Convertible Mark', rate: 0.022 },
    { country: 'Botswana', code: 'BWP', name: 'Botswana Pula', rate: 0.16 },
    { country: 'Brazil', code: 'BRL', name: 'Brazilian Real', rate: 0.063 },
    { country: 'Brunei', code: 'BND', name: 'Brunei Dollar', rate: 0.016 },
    { country: 'Bulgaria', code: 'BGN', name: 'Bulgarian Lev', rate: 0.022 },
    { country: 'Burkina Faso', code: 'XOF', name: 'West African CFA Franc', rate: 7.2 },
    { country: 'Burundi', code: 'BIF', name: 'Burundian Franc', rate: 24 },
    { country: 'Cambodia', code: 'KHR', name: 'Cambodian Riel', rate: 49 },
    { country: 'Cameroon', code: 'XAF', name: 'Central African CFA Franc', rate: 7.2 },
    { country: 'Canada', code: 'CAD', name: 'Canadian Dollar', rate: 0.017 },
    { country: 'Cape Verde', code: 'CVE', name: 'Cape Verdean Escudo', rate: 1.25 },
    { country: 'Central African Republic', code: 'XAF', name: 'Central African CFA Franc', rate: 7.2 },
    { country: 'Chad', code: 'XAF', name: 'Central African CFA Franc', rate: 7.2 },
    { country: 'Chile', code: 'CLP', name: 'Chilean Peso', rate: 10.5 },
    { country: 'China', code: 'CNY', name: 'Chinese Yuan', rate: 0.085 },
    { country: 'Colombia', code: 'COP', name: 'Colombian Peso', rate: 48 },
    { country: 'Comoros', code: 'KMF', name: 'Comorian Franc', rate: 5.6 },
    { country: 'Costa Rica', code: 'CRC', name: 'Costa Rican Colón', rate: 6.3 },
    { country: 'Croatia', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Cuba', code: 'CUP', name: 'Cuban Peso', rate: 0.012 },
    { country: 'Cyprus', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Czech Republic', code: 'CZK', name: 'Czech Koruna', rate: 0.29 },
    { country: 'Denmark', code: 'DKK', name: 'Danish Krone', rate: 0.082 },
    { country: 'Djibouti', code: 'DJF', name: 'Djiboutian Franc', rate: 2.14 },
    { country: 'Dominican Republic', code: 'DOP', name: 'Dominican Peso', rate: 0.67 },
    { country: 'Ecuador', code: 'USD', name: 'US Dollar', rate: 0.012 },
    { country: 'Egypt', code: 'EGP', name: 'Egyptian Pound', rate: 0.38 },
    { country: 'El Salvador', code: 'USD', name: 'US Dollar', rate: 0.012 },
    { country: 'Estonia', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Ethiopia', code: 'ETB', name: 'Ethiopian Birr', rate: 0.64 },
    { country: 'Fiji', code: 'FJD', name: 'Fijian Dollar', rate: 0.027 },
    { country: 'Finland', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'France', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Germany', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Ghana', code: 'GHS', name: 'Ghanaian Cedi', rate: 0.15 },
    { country: 'Greece', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Guatemala', code: 'GTQ', name: 'Guatemalan Quetzal', rate: 0.093 },
    { country: 'Haiti', code: 'HTG', name: 'Haitian Gourde', rate: 1.58 },
    { country: 'Honduras', code: 'HNL', name: 'Honduran Lempira', rate: 0.30 },
    { country: 'Hong Kong', code: 'HKD', name: 'Hong Kong Dollar', rate: 0.094 },
    { country: 'Hungary', code: 'HUF', name: 'Hungarian Forint', rate: 4.2 },
    { country: 'Iceland', code: 'ISK', name: 'Icelandic Króna', rate: 1.6 },
    { country: 'India', code: 'INR', name: 'Indian Rupee', rate: 1 },
    { country: 'Indonesia', code: 'IDR', name: 'Indonesian Rupiah', rate: 190 },
    { country: 'Iran', code: 'IRR', name: 'Iranian Rial', rate: 504 },
    { country: 'Iraq', code: 'IQD', name: 'Iraqi Dinar', rate: 15.6 },
    { country: 'Ireland', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Israel', code: 'ILS', name: 'Israeli New Shekel', rate: 0.044 },
    { country: 'Italy', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Jamaica', code: 'JMD', name: 'Jamaican Dollar', rate: 1.88 },
    { country: 'Japan', code: 'JPY', name: 'Japanese Yen', rate: 1.8 },
    { country: 'Jordan', code: 'JOD', name: 'Jordanian Dinar', rate: 0.0085 },
    { country: 'Kazakhstan', code: 'KZT', name: 'Kazakhstani Tenge', rate: 5.3 },
    { country: 'Kenya', code: 'KES', name: 'Kenyan Shilling', rate: 1.55 },
    { country: 'Kuwait', code: 'KWD', name: 'Kuwaiti Dinar', rate: 0.0037 },
    { country: 'Laos', code: 'LAK', name: 'Lao Kip', rate: 255 },
    { country: 'Latvia', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Lebanon', code: 'LBP', name: 'Lebanese Pound', rate: 18 },
    { country: 'Libya', code: 'LYD', name: 'Libyan Dinar', rate: 0.058 },
    { country: 'Lithuania', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Malaysia', code: 'MYR', name: 'Malaysian Ringgit', rate: 0.055 },
    { country: 'Maldives', code: 'MVR', name: 'Maldivian Rufiyaa', rate: 0.185 },
    { country: 'Mexico', code: 'MXN', name: 'Mexican Peso', rate: 0.21 },
    { country: 'Morocco', code: 'MAD', name: 'Moroccan Dirham', rate: 0.12 },
    { country: 'Myanmar', code: 'MMK', name: 'Burmese Kyat', rate: 25 },
    { country: 'Nepal', code: 'NPR', name: 'Nepalese Rupee', rate: 1.58 },
    { country: 'Netherlands', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'New Zealand', code: 'NZD', name: 'New Zealand Dollar', rate: 0.020 },
    { country: 'Nigeria', code: 'NGN', name: 'Nigerian Naira', rate: 19.5 },
    { country: 'North Korea', code: 'KPW', name: 'North Korean Won', rate: 10.8 },
    { country: 'Norway', code: 'NOK', name: 'Norwegian Krone', rate: 0.13 },
    { country: 'Oman', code: 'OMR', name: 'Omani Rial', rate: 0.0046 },
    { country: 'Pakistan', code: 'PKR', name: 'Pakistani Rupee', rate: 3.15 },
    { country: 'Philippines', code: 'PHP', name: 'Philippine Peso', rate: 0.67 },
    { country: 'Poland', code: 'PLN', name: 'Polish Złoty', rate: 0.048 },
    { country: 'Portugal', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Qatar', code: 'QAR', name: 'Qatari Riyal', rate: 0.044 },
    { country: 'Romania', code: 'RON', name: 'Romanian Leu', rate: 0.054 },
    { country: 'Russia', code: 'RUB', name: 'Russian Ruble', rate: 1.2 },
    { country: 'Saudi Arabia', code: 'SAR', name: 'Saudi Riyal', rate: 0.045 },
    { country: 'Singapore', code: 'SGD', name: 'Singapore Dollar', rate: 0.016 },
    { country: 'South Africa', code: 'ZAR', name: 'South African Rand', rate: 0.22 },
    { country: 'South Korea', code: 'KRW', name: 'South Korean Won', rate: 16 },
    { country: 'Spain', code: 'EUR', name: 'Euro', rate: 0.011 },
    { country: 'Sri Lanka', code: 'LKR', name: 'Sri Lankan Rupee', rate: 3.8 },
    { country: 'Sweden', code: 'SEK', name: 'Swedish Krona', rate: 0.13 },
    { country: 'Switzerland', code: 'CHF', name: 'Swiss Franc', rate: 0.011 },
    { country: 'Thailand', code: 'THB', name: 'Thai Baht', rate: 0.42 },
    { country: 'Turkey', code: 'TRY', name: 'Turkish Lira', rate: 0.40 },
    { country: 'UAE', code: 'AED', name: 'UAE Dirham', rate: 0.044 },
    { country: 'United Kingdom', code: 'GBP', name: 'Pound Sterling', rate: 0.0095 },
    { country: 'United States', code: 'USD', name: 'US Dollar', rate: 0.012 },
    { country: 'Vietnam', code: 'VND', name: 'Vietnamese Đồng', rate: 305 },
    { country: 'Zimbabwe', code: 'ZWL', name: 'Zimbabwean Dollar', rate: 3.8 },
  ];

  // Common currency options (kept for backward compatibility)
  const currencyOptions = [
    { code: 'INR', name: 'Indian Rupee', rate: 1 },
    { code: 'USD', name: 'US Dollar', rate: 0.012 },
    { code: 'EUR', name: 'Euro', rate: 0.011 },
    { code: 'GBP', name: 'British Pound', rate: 0.0095 },
    { code: 'AED', name: 'UAE Dirham', rate: 0.044 },
    { code: 'AUD', name: 'Australian Dollar', rate: 0.018 },
    { code: 'CAD', name: 'Canadian Dollar', rate: 0.017 },
    { code: 'SGD', name: 'Singapore Dollar', rate: 0.016 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">💰 Location Price Manager</h2>
        <p className="text-gray-600">Manage pricing and currency conversion rates for different locations</p>
      </div>

      {/* ✅ Setup Guide */}
      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>📍</span> How Location Detection Works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-6">
          <li>• <strong>Frontend</strong> detects user's location via IP geolocation (returns country name like "India", "United States")</li>
          <li>• <strong>Location Name</strong> should match the detected country name exactly (e.g., "India", "United States", "Germany")</li>
          <li>• <strong>Aliases</strong> are alternative names for the same location (e.g., "USA", "US" for "United States")</li>
          <li>• <strong>Conversion Rate</strong> is how much 1 INR equals in that currency (e.g., 1 INR = 0.012 USD)</li>
          <li>• <strong>Price Increase %</strong> is the markup applied to base prices for that location</li>
        </ul>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${message.includes('Error') || message.includes('required') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          <span className="text-xl">{message.includes('Error') ? '❌' : '✅'}</span>
          <span>{message}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          {editingEntry ? '✏️ Edit Location' : '➕ Add New Location'}
        </h3>
        
        {editingEntry && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
            <p className="text-blue-700 font-semibold flex items-center gap-2">
              <span>📍</span> Editing: {editingEntry.location}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., North America, Europe, Asia"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Aliases */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Aliases (comma-separated)
              </label>
              <input
                type="text"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="e.g., USA, US, United States"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Alternative names for this location</p>
            </div>

            {/* Price Increase */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Price Increase (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={priceIncrease}
                onChange={(e) => setPriceIncrease(e.target.value)}
                placeholder="e.g., 20"
                min="0"
                step="0.01"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Percentage markup for this location</p>
            </div>

            {/* Currency */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Country / Currency <span className="text-red-500">*</span>
              </label>
              <select
                value={currencyCountry}
                onChange={(e) => {
                  const selected = countryOptions.find(c => c.code === e.target.value);
                  if (selected) {
                    setCurrencyCountry(selected.code);
                    setCurrencyConvert(selected.rate.toString());
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Country / Currency</option>
                {countryOptions.map(option => (
                  <option key={option.code + option.country} value={option.code}>
                    {option.country} - {option.code} ({option.name})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select a country to auto-fill currency code and conversion rate</p>
            </div>

            {/* Conversion Rate */}
            <div className="md:col-span-2">
              <label className="block mb-2 font-medium text-gray-700">
                Conversion Rate (to INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={currencyConvert}
                onChange={(e) => setCurrencyConvert(e.target.value)}
                placeholder="e.g., 0.012"
                step="0.000001"
                min="0"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                How much 1 INR equals in this currency (e.g., 1 INR = 0.012 USD)
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              {editingEntry ? '💾 Update Entry' : '➕ Create Entry'}
            </button>
            {editingEntry && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📋 All Price Entries ({entries.length})
          </h3>
          <button
            onClick={fetchPrices}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search by location, alias, or currency..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading entries...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchTerm ? '🔍 No entries match your search' : '📭 No price entries found. Create one above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntries.map((entry, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      📍 {entry.location}
                    </h4>
                    {entry.aliases && entry.aliases.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Aliases:</span> {entry.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-medium flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">💰 Price Increase:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                      +{entry.price_increase}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">💱 Currency:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">
                      {entry.currency?.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">🔄 Conversion Rate:</span>
                    <span className="text-gray-800 font-mono">
                      1 INR = {entry.currency?.toconvert} {entry.currency?.country}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                    <span className="font-medium">Last Updated:</span>{" "}
                    {new Date(entry.time_stamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoneySet;
