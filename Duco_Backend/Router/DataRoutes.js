// routes/invoiceHelper.routes.js
const express = require("express");
const router = express.Router();

const InvoiceHelper = require("../DataBase/Models/InvoiceHelper");

// ---- Default (initial) document ----
const INITIAL_DOC = {
  company: {
    name: "DUCO ART PRIVATE LIMITED",
    address: "SADIJA COMPOUND AVANTI VIHAR LIG 64\nNEAR BANK OF BARODA , RAIPUR C.G",
    gstin: "22AAICD1719N1ZM",
    cin: "U52601CT2020PTC010997",
    email: "Duco@ducoart.com",
    pan: "",
    iec: "",
    gst: "",
    state: "Chhattisgarh" // ✅ Added state field
  },
  invoice: {
    placeOfSupply: "Chhattisgarh (22)",
    reverseCharge: false,
    copyType: "Original Copy"
  },
  terms: [
    "Goods once sold will not be taken back.",
    "Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.",
    "Subject to 'Chhattisgarh' Jurisdiction only."
  ],
  forCompany: "DUCO ART PRIVATE LIMITED"
};

// ---- Helpers ----
async function getOrCreateSingleton() {
  let doc = await InvoiceHelper.findOne({});
  if (!doc) {
    doc = await InvoiceHelper.create(INITIAL_DOC);
  }
  return doc;
}

// ---- READ (get the singleton) ----
router.get("/", async (req, res) => {
  try {
    const doc = await getOrCreateSingleton();
    res.json(doc);
  } catch (err) {
    console.error("GET /invoice-helper error:", err);
    res.status(500).json({ error: "Failed to fetch invoice helper" });
  }
});

// ---- UPDATE (merge update fields) ----
router.put("/", async (req, res) => {
  try {
    const current = await getOrCreateSingleton();
    const payload = req.body || {};

    if (payload.company && typeof payload.company === "object") {
      current.company = {
        ...(current.company?.toObject?.() || current.company || {}),
        ...payload.company
      };
    }

    if (payload.invoice && typeof payload.invoice === "object") {
      current.invoice = {
        ...(current.invoice?.toObject?.() || current.invoice || {}),
        ...payload.invoice
      };
    }

    if (Array.isArray(payload.terms)) {
      current.terms = payload.terms;
    }

    if (typeof payload.forCompany === "string") {
      current.forCompany = payload.forCompany;
    }

    console.log('💾 Saving invoice helper data:', {
      company: current.company,
      invoice: current.invoice,
      terms: current.terms,
      forCompany: current.forCompany
    });

    await current.save();
    
    // ✅ Return the saved document to confirm all fields were saved
    const saved = await getOrCreateSingleton();
    console.log('✅ Saved successfully:', {
      company: saved.company,
      invoice: saved.invoice,
      terms: saved.terms,
      forCompany: saved.forCompany
    });
    
    res.json(saved);
  } catch (err) {
    console.error("PUT /invoice-helper error:", err);
    res.status(500).json({ error: "Failed to update invoice helper" });
  }
});

// ---- RESET (reset to initial state) ----
router.post("/reset", async (req, res) => {
  try {
    await InvoiceHelper.deleteMany({});
    const doc = await InvoiceHelper.create(INITIAL_DOC);
    res.json(doc);
  } catch (err) {
    console.error("POST /invoice-helper/reset error:", err);
    res.status(500).json({ error: "Failed to reset invoice helper" });
  }
});

// ✅ Export both
module.exports = {
  router,
  getOrCreateSingleton
};
