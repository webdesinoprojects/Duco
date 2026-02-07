// controllers/chargePlanController.js
const ChargePlan = require('../DataBase/Models/DefaultChargePlan');

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

  // ✅ If this is GST, convert cost to percent (frontend sends cost, backend stores as percent)
  if (label.includes('gst')) {
    const percent = toNum(raw.percent ?? raw.cost ?? 0, `${label}.percent`);
    if (percent < 0) throw new Error(`${label}.percent must be >= 0`);
    return { minqty, maxqty, percent };
  }

  // ✅ Otherwise it's cost per unit
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
async function getOrCreateSinglePlan() {
  let plan = await ChargePlan.findOne();

  if (!plan) {
    // ✅ Create baseline plan with realistic values
    plan = await ChargePlan.create({
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
    });
  }

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
        'pakageingandforwarding'
      );
    }
    if (body.printingcost != null) {
      update.printingcost = validateAndSortTiers(
        body.printingcost,
        'printingcost'
      );
    }
    if (body.gst != null) {
      update.gst = validateAndSortTiers(body.gst, 'gst');
    }

    if (!Object.keys(update).length) {
      return res
        .status(400)
        .json({ success: false, error: 'No valid fields to update.' });
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
        .json({ success: false, error: 'qty must be a number >= 1' });
    }

    const subtotal = Number(req.query.subtotal ?? req.body?.subtotal ?? 0);
    const plan = await getOrCreateSinglePlan();

    // ✅ Find the matching tier for P&F
    const pfTier = plan.pakageingandforwarding.find((t) => qty >= t.minqty && qty <= t.maxqty);
    const packaging = pfTier ? pfTier.cost : 0;
    const pfMinQty = plan.pakageingandforwarding[0]?.minqty || 1;
    
    // ✅ Find the matching tier for Printing
    const printTier = plan.printingcost.find((t) => qty >= t.minqty && qty <= t.maxqty);
    const printing = printTier ? printTier.cost : 0;
    const printMinQty = plan.printingcost[0]?.minqty || 1;
    
    // Get GST rate (this always applies)
    const gstPercent = findTierValue(plan.gst, qty, 'gst');

    // ✅ Compute totals - P&F and Printing are 0 if qty < minimum threshold
    const pfTotal = qty >= pfMinQty ? packaging * qty : 0;
    const printTotal = qty >= printMinQty ? printing * qty : 0;
    const gstAmount = ((subtotal + pfTotal + printTotal) * gstPercent) / 100;

    res.json({
      success: true,
      data: {
        qty,
        perUnit: {
          pakageingandforwarding: qty >= pfMinQty ? packaging : 0,
          printingcost: qty >= printMinQty ? printing : 0,
          gstPercent: gstPercent,
        },
        totals: {
          pakageingandforwarding: pfTotal,
          printingcost: printTotal,
          gstPercent,
          gstAmount,
          subtotal,
          grandTotal: subtotal + pfTotal + printTotal + gstAmount,
        },
        _debug: {
          pfMinQty,
          printMinQty,
          qtyMeetsPfThreshold: qty >= pfMinQty,
          qtyMeetsPrintThreshold: qty >= printMinQty,
          pfApplied: pfTotal > 0,
          printApplied: printTotal > 0
        }
      },
    });
  } catch (e) {
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
        .json({ success: false, error: 'qty must be a number >= 1' });
    }

    const plan = await getOrCreateSinglePlan();
    
    // ✅ Find the matching tier for P&F
    const pfTier = plan.pakageingandforwarding.find((t) => qty >= t.minqty && qty <= t.maxqty);
    const packaging = pfTier ? pfTier.cost : 0;
    const pfMinQty = plan.pakageingandforwarding[0]?.minqty || 1;
    
    // ✅ Find the matching tier for Printing
    const printTier = plan.printingcost.find((t) => qty >= t.minqty && qty <= t.maxqty);
    const printing = printTier ? printTier.cost : 0;
    const printMinQty = plan.printingcost[0]?.minqty || 1;
    
    // Get GST rate (this always applies)
    const gstPercent = findTierValue(plan.gst, qty, 'gst');

    res.json({
      success: true,
      data: {
        qty,
        perUnit: { 
          pakageingandforwarding: qty >= pfMinQty ? packaging : 0,
          printingcost: qty >= printMinQty ? printing : 0,
          gstPercent: gstPercent,
        },
        gstPercent,
      },
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};
