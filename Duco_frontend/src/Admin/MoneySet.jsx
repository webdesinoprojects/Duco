import React, { useState, useEffect } from "react";
import { createOrUpdatePrice, fetchAllPrices } from "../Service/APIservice";

const MoneySet = () => {
  const [location, setLocation] = useState("");
  const [aliases, setAliases] = useState(""); // ✅ new field
  const [priceIncrease, setPriceIncrease] = useState("");
  const [currencyCountry, setCurrencyCountry] = useState("");
  const [currencyConvert, setCurrencyConvert] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);

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

    if (
      !location ||
      priceIncrease === "" ||
      !currencyCountry ||
      !currencyConvert
    ) {
      setMessage("Location, Price Increase, and Currency details are required");
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
        aliases: aliases
          ? aliases.split(",").map((a) => a.trim()) // ✅ send as array
          : [],
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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Location Price Manager</h2>

      {message && (
        <div className={`mb-3 p-3 rounded ${message.includes('Error') || message.includes('required') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mb-6 space-y-4 bg-gray-100 p-4 rounded"
      >
        {editingEntry && (
          <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-4">
            <p className="text-blue-700 font-semibold">
              Editing: {editingEntry.location}
            </p>
          </div>
        )}
        <div>
          <label className="block mb-1 font-medium">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* ✅ New Aliases Field */}
        <div>
          <label className="block mb-1 font-medium">
            Aliases (comma-separated)
          </label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="Example: USA, US, United States of America"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Price Increase</label>
          <input
            type="number"
            value={priceIncrease}
            onChange={(e) => setPriceIncrease(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Currency Country</label>
          <input
            type="text"
            value={currencyCountry}
            onChange={(e) => setCurrencyCountry(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Currency Conversion Rate
          </label>
          <input
            type="number"
            value={currencyConvert}
            onChange={(e) => setCurrencyConvert(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {editingEntry ? "Update Entry" : "Create Entry"}
          </button>
          {editingEntry && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h3 className="text-xl font-semibold mb-2">All Price Entries</h3>
      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No price entries found. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="border p-3 rounded bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p>
                    <strong>Location:</strong> {entry.location}
                  </p>
                  <p>
                    <strong>Aliases:</strong> {entry.aliases?.join(", ") || "—"}
                  </p>
                  <p>
                    <strong>Price Increase:</strong> {entry.price_increase}%
                  </p>
                  <p>
                    <strong>Currency:</strong> {entry.currency?.country} (Rate: {entry.currency?.toconvert})
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Updated:</strong>{" "}
                    {new Date(entry.time_stamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(entry)}
                  className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MoneySet;
