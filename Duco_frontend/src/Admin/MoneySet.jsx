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

      setMessage(result.message);
      setLocation("");
      setAliases("");
      setPriceIncrease("");
      setCurrencyCountry("");
      setCurrencyConvert("");
      fetchPrices();
    } catch (err) {
      console.error(err);
      setMessage("Error saving data");
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Location Price Manager</h2>

      {message && <p className="mb-3 text-green-600">{message}</p>}

      <form
        onSubmit={handleSubmit}
        className="mb-6 space-y-4 bg-gray-100 p-4 rounded"
      >
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

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-2">All Price Entries</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="border p-3 rounded bg-white shadow-sm">
              <p>
                <strong>Location:</strong> {entry.location}
              </p>
              <p>
                <strong>Aliases:</strong> {entry.aliases?.join(", ") || "—"}
              </p>
              <p>
                <strong>Price Increase:</strong> %{entry.price_increase}
              </p>
              <p>
                <strong>Currency Country:</strong> {entry.currency?.country}
              </p>
              <p>
                <strong>Currency Conversion Rate:</strong>{" "}
                {entry.currency?.toconvert}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Updated:</strong>{" "}
                {new Date(entry.time_stamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MoneySet;
