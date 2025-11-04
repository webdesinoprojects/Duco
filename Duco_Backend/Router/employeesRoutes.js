const express = require("express");
const router = express.Router();
const {
  createEmployeeAcc,
  getEmployeesAcc,
  getEmployeeAccById,
  updateEmployeeAcc,
  checkEmployeeLogin,
  resetEmployeePassword,
} = require("../Controller/employeesAccController");

router.post("/employeesacc", createEmployeeAcc);

router.get("/employeesacc", getEmployeesAcc);

router.get("/employeesacc/:id", getEmployeeAccById);

router.patch("/employeesacc/:id", updateEmployeeAcc);

router.post("/employeesacc/login", checkEmployeeLogin);

router.post("/employeesacc/reset-password", resetEmployeePassword);

// Test endpoint
router.get("/employeesacc/test", (req, res) => {
  res.json({ message: "Employees routes are working!", timestamp: new Date().toISOString() });
});

// Get all employees (for debugging)
router.get("/employeesacc/debug", async (req, res) => {
  try {
    const employees = await require("../DataBase/Models/EmployessAcc").find({}).select("-password");
    res.json({ 
      message: "Employee debug info", 
      count: employees.length,
      employees: employees.map(emp => ({
        employeeid: emp.employeeid,
        email: emp.employeesdetails?.email,
        name: emp.employeesdetails?.name,
        url: emp.url,
        role: emp.employeesdetails?.role
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate temporary access token for URL-based auth
router.post("/employeesacc/generate-token", async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID required" });
    }

    const employee = await require("../DataBase/Models/EmployessAcc").findById(employeeId).select("-password");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Generate a temporary token (valid for 1 hour)
    const token = Buffer.from(JSON.stringify({
      employeeId: employee._id,
      email: employee.employeesdetails?.email,
      timestamp: Date.now(),
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    })).toString('base64');

    const urlParts = employee.url.split('/');
    const section = urlParts[urlParts.length - 1];

    res.json({
      success: true,
      token,
      section,
      authUrl: `/auth/${section}?token=${token}`,
      expiresIn: '1 hour'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
