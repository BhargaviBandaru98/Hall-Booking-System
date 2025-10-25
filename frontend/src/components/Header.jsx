import "./Header.css";
import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userContext } from "../contexts/UserContext.jsx";

function Header() {
  const [selected, setSelected] = useState("home");
  const [user, setUser] = useContext(userContext);
  const navigate = useNavigate();

  // Determine logged-in status based on presence of user info
  const loggedIn = user && Object.keys(user).length > 0;

  function handleLogout() {
    setSelected("home");
    setUser({});
    navigate("/");
  }

  return (
    <>
      {!loggedIn ? (
        <div className="header1">
          <div className="websiteName">VenueVista</div>
          <ul>
            <Link
              to="/"
              className={selected === "home" ? "selected" : "notSelected"}
              onClick={() => setSelected("home")}
            >
              <li>Home</li>
            </Link>
            <Link
              to="/register"
              className={selected === "register" ? "selected" : "notSelected"}
              onClick={() => setSelected("register")}
            >
              <li>Register</li>
            </Link>
            <Link
              to="/login"
              className={selected === "login" ? "selected" : "notSelected"}
              onClick={() => setSelected("login")}
            >
              <li>Login</li>
            </Link>
          </ul>
        </div>
      ) : (
        <div className="header2">
          <div className="websiteName">VenueVista</div>
          <div className="user">
            <h2>Hi, {user.firstname || "User"}!</h2>
          </div>
          <div className="topright">
            <Link to={user.userType === "admin" ? "/adminprofile/profile" : "/userprofile"} className="profileBtn" title="View Profile">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4"/>
                <path d="M12 14c-4 0-6 2-6 4v3h12v-3c0-2-2-4-6-4z"/>
              </svg>
            </Link>
            <div className="logout" onClick={handleLogout}>
              Logout
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
