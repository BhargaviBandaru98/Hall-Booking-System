import "./RootLayout.css";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import {Outlet} from "react-router-dom";
function RootLayout() {
  return (
    <div>
      <div className="glow-bg"></div>
      <Header />
    <div style={{ paddingTop: "0.5px", minHeight: "100vh" }}>
  <Outlet />
  </div>
      <Footer />
    </div>
  );
}

export default RootLayout;