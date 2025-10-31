// controllers/chargePlanController.js
const ChargePlan = require("../DataBase/Models/DefaultChargePlan");

// ---------- helpers ----------
const toNum = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

function normalizeRange(raw, label) {
  const minqty = toNum(raw.minqty, `${label}.minqty`);
  const maxqty = toNum(raw.maxqty, `${label}.maxqty`);

  if (minqty < 1) throw new Error(`${label}.minqty must be >= 1`);
  if (maxqty < minqty) throw new Error(`${label}.maxqty must be >= minqty`);

  // ✅ GST uses percent instead of cost
  if (raw.percent != null) {
    const percent = toNum(raw.percent, `${label}.percent`);
    if (percent < 0) throw new Error(`${label}.percent must be >= 0`);
    return { minqty, maxqty, percent };
  }

  // ✅ Normal cost tiers
  const cost = toNum(raw.cost, `${label}.cost`);
  if (cost < 0) throw new Error(`${label}.cost must be >= 0`);
  return { minqty, maxqty, cost };
}

function validateAndSortTiers(arr, keyName) {
  if (!Array.isArray(arr) || arr.length === 0)
    throw new Error(`${keyName} must be a non-empty array`);

  const tiers = arr
    .map((t, i) => normalizeRange(t, `${keyName}[${i}]`))
    .sort((a, b) => a.minqty - b.minqty);

  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const cur = tiers[i];
    if (cur.minqty <= prev.maxqty) {
      throw new Error(
        `${keyName} tiers overlap: tier ${i} minqty (${cur.minqty}) <= previous maxqty (${prev.maxqty})`
      );
    }
  }
  return tiers;
}

function findTierValue(tiers, qty, label) {
  const hit = tiers.find((t) => qty >= t.minqty && qty <= t.maxqty);
  if (!hit) throw new Error(`No matching ${label} tier for qty=${qty}`);
  return hit.percent != null ? hit.percent : hit.cost; // ✅ GST uses percent
}

// ---------- default plan ----------
// ---------- default plan ----------
async function getOrCreateSinglePlan() {
  let plan = await ChargePlan.findOne();

  // ✅ default data definition
  const defaultData = {
    pakageingandforwarding: [
      { minqty: 1, maxqty: 50, cost: 12 },
      { minqty: 51, maxqty: 200, cost: 10 },
      { minqty: 201, maxqty: 1000000000, cost: 8 },
    ],
    printingcost: [
      { minqty: 1, maxqty: 50, cost: 15 },
      { minqty: 51, maxqty: 200, cost: 12 },
      { minqty: 201, maxqty: 1000000000, cost: 10 },
    ],
    gst: [{ minqty: 1, maxqty: 1000000000, percent: 5 }],
  };

  // ✅ If no plan → create new
  if (!plan) {
    plan = await ChargePlan.create(defaultData);
    console.log("✅ Created default charge plan");
    return plan;
  }

  // ✅ If plan exists but missing any array → patch it automatically
  let updated = false;
  for (const key of Object.keys(defaultData)) {
    if (!Array.isArray(plan[key]) || plan[key].length === 0) {
      plan[key] = defaultData[key];
      updated = true;
      console.log(`⚙️ Restored missing key '${key}' in ChargePlan.`);
    }
  }

  if (updated) await plan.save();
  console.log("✅ ChargePlan was missing data and has been patched.");
  return plan;
}

// ---------- controllers ----------
exports.getPlan = async (req, res) => {
  try {
    const plan = await getOrCreateSinglePlan();
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};

    if (body.pakageingandforwarding != null) {
      update.pakageingandforwarding = validateAndSortTiers(
        body.pakageingandforwarding,
        "pakageingandforwarding"
      );
    }
    if (body.printingcost != null) {
      update.printingcost = validateAndSortTiers(
        body.printingcost,
        "printingcost"
      );
    }
    if (body.gst != null) {
      update.gst = validateAndSortTiers(body.gst, "gst");
    }

    if (!Object.keys(update).length) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update." });
    }

    const plan = await getOrCreateSinglePlan();
    Object.assign(plan, update);
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

// ---------- main calculation ----------
exports.getTotalsForQty = async (req, res) => {
  try {
    const qty = Number(req.query.qty ?? req.body?.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      return res
        .status(400)
        .json({ success: false, error: "qty must be a number >= 1" });
    }

    const subtotal = Number(req.query.subtotal ?? req.body?.subtotal ?? 0);
    const plan = await getOrCreateSinglePlan();

    // ✅ Actual tiered rate lookup
    const packaging = findTierValue(
      plan.pakageingandforwarding,
      qty,
      "pakageingandforwarding"
    );
    const printing = findTierValue(plan.printingcost, qty, "printingcost");
    const gstPercent = findTierValue(plan.gst, qty, "gst");

    // ✅ Compute totals
    const pfTotal = packaging * qty;
    const printTotal = printing * qty;
    const gstAmount = ((subtotal + pfTotal + printTotal) * gstPercent) / 100;
    const grandTotal = subtotal + pfTotal + printTotal + gstAmount;

    // ✅ Final response
    res.json({
      success: true,
      data: {
        qty,
        perUnit: {
          pakageingandforwarding: packaging,
          printingcost: printing,
        },
        totals: {
          pakageingandforwarding: pfTotal,
          printingcost: printTotal,
          gstPercent,
          gstAmount,
          subtotal,
          grandTotal,
        },
      },
    });
  } catch (e) {
    console.error("❌ Error in getTotalsForQty:", e);
    res.status(400).json({ success: false, error: e.message });
  }
};

// ---------- legacy compatibility endpoint ----------
exports.getRatesForQty = async (req, res) => {
  try {
    const qty = Number(req.query.qty ?? req.body?.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      return res
        .status(400)
        .json({ success: false, error: "qty must be a number >= 1" });
    }

    const plan = await getOrCreateSinglePlan();
    const packaging = findTierValue(
      plan.pakageingandforwarding,
      qty,
      "pakageingandforwarding"
    );
    const printing = findTierValue(plan.printingcost, qty, "printingcost");
    const gstPercent = findTierValue(plan.gst, qty, "gst");

    res.json({
      success: true,
      data: {
        qty,
        perUnit: {
          pakageingandforwarding: packaging,
          printingcost: printing,
        },
        gstPercent,
      },
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};
