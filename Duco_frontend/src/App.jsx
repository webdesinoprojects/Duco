import React, { Component } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout.jsx";
import Home from "./Pages/Home.jsx";
import "./App.css";
import Prodcuts from "./Pages/Prodcuts.jsx";
import Contact from "./Pages/Contact.jsx";
import ProductPage from "./Pages/ProductPage.jsx";
import Adminhome from "./Admin/Home.jsx";
import Cart from "./Pages/Cart.jsx";
import GetBulk from "./Pages/GetBulk.jsx";
import Order from "./Pages/Order.jsx";
import ProdcutsCreated from "./Admin/ProdcutsCreated.jsx";
import AdminLayout from "./Admin/AdminLayout .jsx";
import Category from "./Admin/Category.jsx";
import { CartProvider } from "./ContextAPI/CartContext.jsx";
import TShirtDesigner from "./Pages/TShirtDesigner.jsx";
import MoneySet from "./Admin/MoneySet.jsx";
import { UserProvider } from "./ContextAPI/UserContext.jsx";
import ProfilePanel from "./Pages/ProfilePanel.jsx";
import SaerchingPage from "./Pages/SaerchingPage.jsx";
import ProductsUpdate from "./Admin/ProductsUpdate.jsx";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import CurrentLocation from "./Pages/CurrentLocation.jsx";
import { PriceProvider } from "./ContextAPI/PriceContext.jsx";
import PaymentPage from "./Pages/PaymentPage.jsx";
import RefundReturnPolicy from "./Pages/RefundReturnPolicy.jsx";
import PrivacyPolicy from "./Pages/PrivacyPolicy.jsx";
import ShippingPolicy from "./Pages/ShippingPolicy.jsx";
import TermsConditions from "./Pages/TermsConditions.jsx";
import OrderProcessing from "./Components/OrderProcessing.jsx";
import OrderSection from "./Admin/OderSection.jsx";
import SizeChange from "./Pages/SizeChange.jsx";
import AnalyticsDashboard from "./Admin/AnalyticsDashboard.jsx";
import ProductRouter from "./Pages/ProductRouter.jsx";
import UserInfo from "./Admin/UserInfo.jsx";
import Banner from "./Admin/Components/Banner.jsx";
import OrderBulk from "./Admin/OrderBulk.jsx";
import AdminGuard from "./Admin/auth/AdminGuard.jsx";
import AdminLogin from "./Admin/AdminLogin.jsx";
import LogisticsManager from "./Admin/LogisticsManager.jsx";
import TrackOrder from "./Pages/TrackOrder.jsx";
import ChargePlanManager from "./Admin/ChargePlanManager.jsx";

import BankDetailsManager from "./Admin/BankDetailsManager.jsx";
import TrackingManager from "./Admin/TrackingManager.jsx";
import EmployessLayout from "./Admin/EmployessLayout.jsx";
import EmployeesAccManager from "./Admin/EmployeesAccManager.jsx";
import EmployeeLogin from "./Admin/Components/EmployeeLogin.jsx";
import EmployeePrivateRoute from "./Admin/Components/EmployeePrivateRoute.jsx";

import Invoice from "./Admin/Invoice.jsx";
import InvoiceSet from "./Pages/InvoiceSet.jsx";
import WalletPage from "./Pages/WalletPage.jsx";
import OrderSuccess from "./Pages/OrderSuccess.jsx";
import ScrollToTop from "./Components/ScrollToTop.jsx";

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "white", backgroundColor: "#0A0A0A", minHeight: "100vh" }}>
          <h1>Something went wrong.</h1>
          <pre style={{ color: "red" }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: "10px", padding: "10px", cursor: "pointer" }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" // or "dark"
      />
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <PriceProvider>
              {" "}
              <CartProvider>
                {" "}
                <UserProvider>
                  {" "}
                  <Layout />{" "}
                </UserProvider>{" "}
              </CartProvider>{" "}
            </PriceProvider>
          }
        >
          <Route index path="" element={<Home />} />
          <Route index path="/home" element={<Home />} />
          <Route path="/men" element={<Prodcuts gender="Male" />} />
          <Route path="/women" element={<Prodcuts gender="Female" />} />
          <Route path="/kid" element={<Prodcuts gender="Kids" />} />
          <Route path="/corporate" element={<Prodcuts />} />
          <Route path="/corporate" element={<Prodcuts />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/products/:id" element={<ProductRouter />} />
          <Route path="/getbulk" element={<GetBulk />} />
          <Route path="/order" element={<Order />} />
          <Route path="/get/logistics/:id" element={<TrackOrder />} />
          <Route path="/design/:proid/:color" element={<TShirtDesigner />} />
          <Route path="/profile" element={<ProfilePanel />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/order-processing" element={<OrderProcessing />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />

          <Route
            path="/products/subcategory/:id/:catogory_name"
            element={<SaerchingPage />}
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="/refund-return-policy"
            element={<RefundReturnPolicy />}
          />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/get_size/:id" element={<SizeChange />} />
          <Route path="/wallet/:userId" element={<WalletPage />} />
        </Route>
        <Route path="/invoice/:id" element={<InvoiceSet />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Adminhome />} />
            <Route path="products" element={<ProdcutsCreated />} />
            <Route path="category" element={<Category />} />
            <Route path="moneyset" element={<MoneySet />} />
            <Route path="edit/:id" element={<ProductsUpdate />} />
            <Route path="order" element={<OrderSection />} />
            <Route path="bulkorder" element={<OrderBulk />} />
            <Route path="sales" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UserInfo />} />
            <Route path="bannersetup" element={<Banner />} />
            <Route path="logistic" element={<LogisticsManager />} />
            <Route path="charges" element={<ChargePlanManager />} />
            <Route path="bankdetails" element={<BankDetailsManager />} />
            <Route path="employees" element={<EmployeesAccManager />} />
            <Route path="tracking" element={<TrackingManager />} />
            <Route path="invoice" element={<Invoice />} />
          </Route>
        </Route>

        <Route path="/employee-login" element={<EmployeeLogin />} />

        {/* Protected group */}
        <Route path="/employees" element={<EmployeePrivateRoute />}>
          <Route element={<EmployessLayout />}>
            <Route index element={<Navigate to="/employees/banners" replace />} />
            <Route path="banners" element={<Banner />} />
            <Route path="products" element={<ProdcutsCreated />} />
            <Route path="category" element={<Category />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
