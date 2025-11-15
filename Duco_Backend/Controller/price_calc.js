const Price = require('../DataBase/Models/MoneyModel.js');

// Get price increase percentage by location (with alias support)
const getUpdatePricesByLocation = async (req, res) => {
    const { location } = req.body;

    try {
        if (!location) {
            return res.status(400).json({ message: 'Location is missing' });
        }

        // Search by location or aliases
        const ref = await Price.findOne({
            $or: [
                { location: { $regex: new RegExp(`^${location}$`, 'i') } },
                { aliases: { $in: [new RegExp(`^${location}$`, 'i')] } }
            ]
        });

        if (!ref) {
            return res.status(404).json({ 
                success: false,
                message: 'Location not found' 
            });
        }

        const increased_percentage = ref?.price_increase;
        const currency_info = ref?.currency; // Retrieve the currency details

        return res.status(200).json({
            success: true,
            percentage: increased_percentage,
            currency: currency_info // Send currency info along with the percentage
        });
    } catch (error) {
        console.error('Error calculating updated prices:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

// Create or update price entry (with aliases support)
const createOrUpdatePriceEntry = async (req, res) => {
    try {
        const { location, price_increase, currency, aliases } = req.body;

        console.log('📥 Received price entry request:', { location, price_increase, currency, aliases });

        if (!location || price_increase === undefined || !currency || !currency.country || !currency.toconvert) {
            return res.status(400).json({ 
                success: false,
                message: 'Location, price_increase, and currency details are required' 
            });
        }

        let entry = await Price.findOne({ location: location });

        if (entry) {
            // Update the existing entry
            entry.price_increase = price_increase;
            entry.currency = currency;
            entry.aliases = aliases || [];
            await entry.save();

            console.log('✅ Entry updated:', entry);

            return res.status(200).json({
                success: true,
                message: `Entry updated for location ${location} successfully`,
                data: entry
            });
        } else {
            // Create a new entry if it doesn't exist
            const newEntry = new Price({
                location,
                price_increase,
                currency,
                aliases: aliases || []
            });
            await newEntry.save();

            console.log('✅ New entry created:', newEntry);

            return res.status(201).json({
                success: true,
                message: 'Price entry created successfully',
                data: newEntry
            });
        }
    } catch (error) {
        console.error('❌ Error occurred:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Server not responding',
            error: error.message 
        });
    }
};

// Get all price entries
const getAllPrices = async (req, res) => {
    try {
        const prices = await Price.find().sort({ time_stamp: -1 }); // newest first
        res.status(200).json(prices);
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).json({ message: 'Server error while retrieving prices' });
    }
};

module.exports = { getUpdatePricesByLocation, createOrUpdatePriceEntry, getAllPrices };
