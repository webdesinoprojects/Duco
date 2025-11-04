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

module.exports = router;
