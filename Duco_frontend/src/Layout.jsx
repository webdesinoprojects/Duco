import React, { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Components/Navbar.jsx";
import Footer from "./Components/Footer.jsx";
import { UserContext } from "./ContextAPI/UserContext.jsx";
import Signup from "./Components/Signup.jsx";
import ProductMegaMenu from "./Components/ProductMegaMenuXX.jsx"; 

const Layout = () => {
  const { user, login, logout } = useContext(UserContext);

  const [isOpenLog, setIsOpenLog] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = SignUp

  const location = useLocation();
  const isTshirtDesigner =
    location.pathname.startsWith("/design/") && window.innerWidth < 1024;
  // mobile view + TShirtDesigner path

  return (
    <>
      <div className="min-h-screen w-full bg-[#0A0A0A] montserrat-light relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E5C870] to-transparent"></div>

        {/* Pass down states to Navbar if needed */}
        <Navbar setIsOpenLog={setIsOpenLog} user={user} />

        <div>
          <Outlet context={{ setIsOpenLog }} />
        </div>

        {/* Example: Conditional login/signup modal */}
        {isOpenLog && (
          <Signup
            isLogin={isLogin}
            setIsLogin={setIsLogin}
            setIsOpenLog={setIsOpenLog}
            login={login}
          />
        )}

        {/* Footer will be hidden only on TShirtDesigner mobile */}
        {!isTshirtDesigner && <Footer />}
      </div>
    </>
  );
};

export default Layout;
