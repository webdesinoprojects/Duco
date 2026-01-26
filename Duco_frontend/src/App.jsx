// App.jsx
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
import OrderProcessing from "./Pages/OrderProcessing.jsx";
import OrderSection from "./Admin/OderSection.jsx";
import SizeChange from "./Pages/SizeChange.jsx";
import AnalyticsDashboard from "./Admin/AnalyticsDashboard.jsx";
import ProductRouter from "./Pages/ProductRouter.jsx";
import UserInfo from "./Admin/UserInfo.jsx";
import Banner from "./Admin/Components/Banner.jsx";
import LandingPageManager from "./Admin/Components/LandingPageManager.jsx";
import EmployeeSection from "./Admin/Components/EmployeeSection.jsx";
import EmployeeAuthRequired from "./Admin/Components/EmployeeAuthRequired.jsx";
import EmployeeDebug from "./Admin/Components/EmployeeDebug.jsx";
import OrderBulk from "./Admin/OrderBulk.jsx";
import AdminGuard from "./Admin/auth/AdminGuard.jsx";
import AdminLogin from "./Admin/AdminLogin.jsx";
import ForgotPassword from "./Admin/ForgotPassword.jsx";
import LogisticsManager from "./Admin/LogisticsManager.jsx";
import TrackOrder from "./Pages/TrackOrder.jsx";
import ChargePlanManager from "./Admin/ChargePlanManager.jsx";
import BankDetailsManager from "./Admin/BankDetailsManager.jsx";
import TrackingManager from "./Admin/TrackingManager.jsx";
import EmployessLayout from "./Admin/EmployessLayout.jsx";
import EmployeesAccManager from "./Admin/EmployeesAccManager.jsx";
import EmployeeLogin from "./Admin/Components/EmployeeLogin.jsx";
import EmployeePrivateRoute from "./Admin/Components/EmployeePrivateRoute.jsx";
import CorporateSettings from "./Admin/CorporateSettings.jsx";
import Invoice from "./Admin/Invoice.jsx";
import InvoiceSet from "./Pages/InvoiceSet.jsx";
import WalletPage from "./Pages/WalletPage.jsx";
import OrderSuccess from "./Pages/OrderSuccess.jsx";
import ScrollToTop from "./Components/ScrollToTop.jsx";
import SearchResults from "./Pages/SearchResults.jsx";
import CategoryPage from "./Pages/CategoryPage.jsx";
import Blog from "./Pages/Blog.jsx";
import BlogPost from "./Pages/BlogPost.jsx";
import BlogManager from "./Admin/BlogManager.jsx";
import About from "./Pages/About.jsx";
import WhatsAppButton from "./components/WhatsAppButton.jsx";

/* ---------------- ERROR BOUNDARY ---------------- */
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
        <div style={{ padding: 20 }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
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
        {/* ================= USER WEBSITE ================= */}
        <Route
          path="/"
          element={
            <PriceProvider>
              <CartProvider>
                <UserProvider>
                  <>
                    <Layout />
                    <WhatsAppButton /> {/* ✅ USER SIDE ONLY */}
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
          <Route path="products/:id" element={<ProductRouter />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="order-processing" element={<OrderProcessing />} />
          <Route path="order-success/:orderId" element={<OrderSuccess />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path=":slug" element={<CategoryPage />} />
        </Route>

        {/* ================= ADMIN ================= */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Adminhome />} />
            <Route path="products" element={<ProdcutsCreated />} />
            <Route path="category" element={<Category />} />
            <Route path="moneyset" element={<MoneySet />} />
            <Route path="order" element={<OrderSection />} />
            <Route path="sales" element={<AnalyticsDashboard />} />
            <Route path="users" element={<UserInfo />} />
            <Route path="blog" element={<BlogManager />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
