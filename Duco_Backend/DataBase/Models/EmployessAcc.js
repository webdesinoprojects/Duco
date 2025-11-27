const mongoose = require("mongoose");

const EmployeesAccSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    employeeid: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    employeesdetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      role: { 
        type: String, 
        enum: [
          'Graphic Designer',
          'Order Manager', 
          'Accounting and Management',
          'Admin',
          'Manager',
          'Supervisor',
          'Executive',
          'Assistant',
          'Intern',
          'Consultant',
          'Specialist'
        ],
        trim: true 
      },
    },
    // Role-based permissions
    permissions: {
      // Graphic Designer permissions
      inventory: { type: Boolean, default: false },
      categories: { type: Boolean, default: false },
      products: { type: Boolean, default: false },
      banner: { type: Boolean, default: false },
      blog: { type: Boolean, default: false },
      
      // Order Manager permissions
      manageBulkOrder: { type: Boolean, default: false },
      manageOrder: { type: Boolean, default: false },
      logistics: { type: Boolean, default: false },
      setMoney: { type: Boolean, default: false },
      chargesPlan: { type: Boolean, default: false },
      corporateSettings: { type: Boolean, default: false },
      
      // Accounting and Management permissions
      bankDetails: { type: Boolean, default: false },
      employeeManagement: { type: Boolean, default: false },
      userAnalysis: { type: Boolean, default: false },
      invoice: { type: Boolean, default: false },
      sales: { type: Boolean, default: false },
    },
    employeesNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-set permissions based on role
EmployeesAccSchema.pre('save', function(next) {
  const role = this.employeesdetails?.role;
  
  // Reset all permissions first
  this.permissions = {
    inventory: false,
    categories: false,
    products: false,
    banner: false,
    blog: false,
    manageBulkOrder: false,
    manageOrder: false,
    logistics: false,
    setMoney: false,
    chargesPlan: false,
    corporateSettings: false,
    bankDetails: false,
    employeeManagement: false,
    userAnalysis: false,
    invoice: false,
    sales: false,
  };
  
  // Set permissions based on role
  if (role === 'Graphic Designer') {
    this.permissions.inventory = true;
    this.permissions.categories = true;
    this.permissions.products = true;
    this.permissions.banner = true;
    this.permissions.blog = true;
  } else if (role === 'Order Manager') {
    this.permissions.manageBulkOrder = true;
    this.permissions.manageOrder = true;
    this.permissions.logistics = true;
    this.permissions.setMoney = true;
    this.permissions.chargesPlan = true;
    this.permissions.corporateSettings = true;
  } else if (role === 'Accounting and Management') {
    this.permissions.bankDetails = true;
    this.permissions.employeeManagement = true;
    this.permissions.userAnalysis = true;
    this.permissions.invoice = true;
    this.permissions.sales = true;
  }
  
  next();
});

EmployeesAccSchema.index({ url: 1, employeeid: 1 }, { unique: true });

module.exports = mongoose.model("EmployeesAcc", EmployeesAccSchema);
