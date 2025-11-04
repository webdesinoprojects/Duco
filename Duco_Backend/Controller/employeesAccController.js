const bcrypt = require("bcrypt");
const EmployeesAcc = require("../DataBase/Models/EmployessAcc");

exports.createEmployeeAcc = async (req, res) => {
  try {
    req.body.password = await bcrypt.hash(req.body.password, 10);
    const doc = await EmployeesAcc.create(req.body);
    const obj = doc.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.getEmployeesAcc = async (req, res) => {
  try {
    console.log('📋 GET /employeesacc - Request received:', req.query);
    const { url, employeeid } = req.query;
    const query = {};
    if (url) query.url = url;
    if (employeeid) query.employeeid = employeeid;
    const docs = await EmployeesAcc.find(query).select("-password").sort({ createdAt: -1 });
    console.log('📋 Found employees:', docs.length);
    res.json(docs);
  } catch (err) {
    console.error('❌ Error in getEmployeesAcc:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.getEmployeeAccById = async (req, res) => {
  try {
    const doc = await EmployeesAcc.findById(req.params.id).select("-password");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateEmployeeAcc = async (req, res) => {
  try {
    if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
    const doc = await EmployeesAcc.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.checkEmployeeLogin = async (req, res) => {
  try {
    console.log('🔐 Employee login attempt:', req.body);
    const { employeeid, password } = req.body;
    if (!employeeid || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ ok: false, error: "Missing credentials" });
    }
    const user = await EmployeesAcc.findOne({ employeeid });
    console.log('👤 User found:', !!user, user ? user.employeeid : 'none');
    if (!user) return res.json({ ok: false, error: "Employee not found" });
    const ok = await bcrypt.compare(password, user.password);
    console.log('🔑 Password check:', ok);
    if (ok) {
      res.json({ 
        ok: true, 
        url: user.url,
        employee: {
          id: user._id,
          employeeid: user.employeeid,
          name: user.employeesdetails?.name,
          email: user.employeesdetails?.email,
          role: user.employeesdetails?.role
        }
      });
    } else {
      console.log('❌ Password incorrect');
      res.json({ ok: false, error: "Invalid password" });
    }
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

exports.resetEmployeePassword = async (req, res) => {
  try {
    const { employeeid, newPassword, confirmPassword } = req.body;
    if (!employeeid || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    const user = await EmployeesAcc.findOne({ employeeid });
    if (!user) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
