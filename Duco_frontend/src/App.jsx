// App.jsx
import React, { Component } from "react";
import { Routes, Route } from "react-router-dom";

/* ================= CORE ================= */
import Layout from "./Layout.jsx";
import ScrollToTop from "./Components/ScrollToTop.jsx";
import "./App.css";

/* ================= CONTEXT ================= */
import { CartProvider } from "./ContextAPI/CartContext.jsx";
import { UserProvider } from "./ContextAPI/UserContext.jsx";
import { PriceProvider } from "./ContextAPI/PriceContext.jsx";

/* ================= USER PAGES ================= */
import Home from "./Pages/Home.jsx";
import Prodcuts from "./Pages/Prodcuts.jsx";
import Contact from "./Pages/Contact.jsx";
import About from "./Pages/About.jsx";
import Cart from "./Pages/Cart.jsx";
import ProductRouter from "./Pages/ProductRouter.jsx";
import TShirtDesigner from "./Pages/TShirtDesigner.jsx";
import PaymentPage from "./Pages/PaymentPage.jsx";
import OrderProcessing from "./Pages/OrderProcessing.jsx";
import OrderSuccess from "./Pages/OrderSuccess.jsx";
import WalletPage from "./Pages/WalletPage.jsx";
import Blog from "./Pages/Blog.jsx";
import BlogPost from "./Pages/BlogPost.jsx";
import CategoryPage from "./Pages/CategoryPage.jsx";
import Order from "./Pages/Order.jsx";
import ProfilePanel from "./Pages/ProfilePanel.jsx";
import PrivacyPolicy from "./Pages/PrivacyPolicy.jsx";
import RefundReturnPolicy from "./Pages/RefundReturnPolicy.jsx";
import ShippingPolicy from "./Pages/ShippingPolicy.jsx";
import TermsConditions from "./Pages/TermsConditions.jsx";
import ExportQuality from "./Pages/ExportQuality.jsx";
import TrackOrder from "./Pages/TrackOrder.jsx";
import InvoiceSet from "./Pages/InvoiceSet.jsx";

/* ================= ADMIN ================= */
import AdminLayout from "./Admin/AdminLayout .jsx";
import Adminhome from "./Admin/Home.jsx";
import AdminLogin from "./Admin/AdminLogin.jsx";
import ForgotPassword from "./Admin/ForgotPassword.jsx";
import AdminGuard from "./Admin/auth/AdminGuard.jsx";

import ProdcutsCreated from "./Admin/ProdcutsCreated.jsx";
import ProductsUpdate from "./Admin/ProductsUpdate.jsx";
import Category from "./Admin/Category.jsx";
import MoneySet from "./Admin/MoneySet.jsx";
import OrderSection from "./Admin/OderSection.jsx";
import AnalyticsDashboard from "./Admin/AnalyticsDashboard.jsx";
import UserInfo from "./Admin/UserInfo.jsx";
import BlogManager from "./Admin/BlogManager.jsx";
import ChargePlanManager from "./Admin/ChargePlanManager.jsx";
import CorporateSettings from "./Admin/CorporateSettings.jsx";
import LandingPageManager from "./Admin/Components/LandingPageManager.jsx";
import EmployeesAccManager from "./Admin/EmployeesAccManager.jsx";
import LogisticsManager from "./Admin/LogisticsManager.jsx";
import TrackingManager from "./Admin/TrackingManager.jsx";
import BankDetailsManager from "./Admin/BankDetailsManager.jsx";
import Invoice from "./Admin/Invoice.jsx";

/* ================= EMPLOYEE ================= */
import EmployeeLogin from "./Admin/Components/EmployeeLogin.jsx";
import EmployeePrivateRoute from "./Admin/Components/EmployeePrivateRoute.jsx";
import EmployessLayout from "./Admin/EmployessLayout.jsx";
import EmployeeSection from "./Admin/Components/EmployeeSection.jsx";
import OrderBulk from "./Admin/OrderBulk.jsx";
import EmployeeDebug from "./Admin/Components/EmployeeDebug.jsx";

/* ================= UI ================= */
import WhatsAppButton from "./components/WhatsAppButton.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ================= ERROR BOUNDARY ================= */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h1>Something went wrong</h1>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <ToastContainer position="top-right" autoClose={3000} />
      <ScrollToTop />

      <Routes>
        {/* ================= USER ================= */}
        <Route
          path="/"
          element={
            <PriceProvider>
              <CartProvider>
                <UserProvider>
                  <>
                    <Layout />
                    <WhatsAppButton />
                  </>
                </UserProvider>
              </CartProvider>
            </PriceProvider>
          }
        >
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="men" element={<Prodcuts gender="Male" />} />
          <Route path="women" element={<Prodcuts gender="Female" />} />
          <Route path="kids" element={<Prodcuts gender="Kids" />} />
          <Route path="contact" element={<Contact />} />
          <Route path="about" element={<About />} />
          <Route path="cart" element={<Cart />} />
          <Route path="products/subcategory/:id/:name" element={<Prodcuts />} />
          <Route path="products/:id" element={<ProductRouter />} />
          <Route path="design/:proid/:color" element={<TShirtDesigner />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="order-processing" element={<OrderProcessing />} />
          <Route path="order-success/:orderId" element={<OrderSuccess />} />
          <Route path="wallet/:userId" element={<WalletPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="order" element={<Order />} />
          <Route path="profile" element={<ProfilePanel />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="refund-return-policy" element={<RefundReturnPolicy />} />
          <Route path="shipping-policy" element={<ShippingPolicy />} />
          <Route path="terms-and-conditions" element={<TermsConditions />} />
          <Route path="exportquality" element={<ExportQuality />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="get/logistics/:id" element={<TrackOrder />} />
          <Route path="invoice/:id" element={<InvoiceSet />} />
          <Route path=":slug" element={<CategoryPage />} />
        </Route>

        {/* ================= ADMIN AUTH ================= */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        {/* ================= ADMIN PANEL ================= */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Adminhome />} />
            <Route path="products" element={<ProdcutsCreated />} />
            <Route path="edit/:id" element={<ProductsUpdate />} />
            <Route path="category" element={<Category />} />
            <Route path="moneyset" element={<MoneySet />} />
            <Route path="charges" element={<ChargePlanManager />} />
            <Route path="order" element={<OrderSection />} />
            <Route path="sales" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UserInfo />} />
            <Route path="blog" element={<BlogManager />} />
            <Route path="corporate-settings" element={<CorporateSettings />} />
            <Route path="landing-page" element={<LandingPageManager />} />
            <Route path="employees" element={<EmployeesAccManager />} />
            <Route path="logistic" element={<LogisticsManager />} />
            <Route path="tracking" element={<TrackingManager />} />
            <Route path="bankdetails" element={<BankDetailsManager />} />
            <Route path="invoice" element={<Invoice />} />
            <Route path="bulkorder" element={<OrderBulk />} />
          </Route>
        </Route>

        {/* ================= EMPLOYEE ================= */}
        <Route path="/employee-login" element={<EmployeeLogin />} />
        <Route element={<EmployeePrivateRoute />}>
          <Route path="/employee" element={<EmployessLayout />}>
            <Route index element={<EmployeeSection />} />
            <Route path="orders" element={<OrderBulk />} />
            <Route path="debug" element={<EmployeeDebug />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
