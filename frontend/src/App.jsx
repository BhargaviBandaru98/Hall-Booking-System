import "./App.css";
import { useRoutes, Navigate } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import Login from "./components/Login";
import Registration from "./components/Registration";
import Home from "./components/Home";
import UserProfile from "./components/user-components/UserProfile.jsx";
import AdminProfile from "./components/admin-components/AdminProfile";
import MyBookings from "./components/user-components/MyBookings.jsx";
import AllBookings from "./components/user-components/AllBookings.jsx";
import ViewHalls from "./components/user-components/ViewHalls.jsx";
import BookHall from "./components/user-components/BookHall.jsx";
import Halls from "./components/admin-components/Halls.jsx";
import ActiveBookings from "./components/admin-components/ActiveBookings.jsx";
import VerifyBookings from "./components/admin-components/VerifyBookings.jsx";
import AllUsers from "./components/admin-components/AllUsers.jsx";
import VerifyUsers from "./components/admin-components/VerifyUsers.jsx";
import Announce from "./components/admin-components/Announce.jsx";
import AdminProfileSettings from "./components/admin-components/AdminProfileSettings.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { useContext, useState, useEffect } from "react";
import { userContext } from "./contexts/UserContext.jsx";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function App() {
  const [user, setUser] = useContext(userContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`${BASE_URL}/auth/current-user`);
        if (res.data.user) {
          setUser(res.data.user);
          setLoading(false);
          return;
        }
        setUser(null);
      } catch (error) {
        console.warn("Initial current-user fetch failed:", error?.response?.status, error?.message);
        // Try refresh token flow for user first
        try {
          console.log("Attempting to refresh access token via /user-api/refresh-token");
          await axios.post(`${BASE_URL}/user-api/refresh-token`);
          const retry = await axios.get(`${BASE_URL}/auth/current-user`);
          if (retry.data.user) {
            setUser(retry.data.user);
            setLoading(false);
            return;
          }
        } catch (errUserRefresh) {
          console.warn("User refresh failed:", errUserRefresh?.response?.status);
          // Try admin refresh
          try {
            console.log("Attempting to refresh access token via /admin-api/refresh-token");
            await axios.post(`${BASE_URL}/admin-api/refresh-token`);
            const retryAdmin = await axios.get(`${BASE_URL}/auth/current-user`);
            if (retryAdmin.data.user) {
              setUser(retryAdmin.data.user);
              setLoading(false);
              return;
            }
          } catch (errAdminRefresh) {
            console.warn("Admin refresh failed:", errAdminRefresh?.response?.status);
          }
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  const routes = [
    {
      path: "",
      element: <RootLayout />,
      children: [
        { path: "", element: <Home /> },
        { path: "register", element: <Registration /> },
        { path: "login", element: <Login /> },

        {
          element: <ProtectedRoute isAuthenticated={!!user && user.userType === "user"} />,
          children: [
            {
              path: "userprofile",
              element: <UserProfile />,
              children: [
                { path: "viewhalls", element: <ViewHalls /> },
                { path: "bookhall", element: <BookHall /> },
                { path: "allbookings", element: <AllBookings /> },
                { path: "mybookings", element: <MyBookings /> },
                { path: "", element: <Navigate to="viewhalls" /> },
              ],
            },
          ],
        },
        {
          element: <ProtectedRoute isAuthenticated={!!user && user.userType === "admin"} />,
          children: [
            {
              path: "adminprofile",
              element: <AdminProfile />,
              children: [
                { path: "halls", element: <Halls /> },
                { path: "activebookings", element: <ActiveBookings /> },
                { path: "verifybookings", element: <VerifyBookings /> },
                { path: "allusers", element: <AllUsers /> },
                { path: "verifyusers", element: <VerifyUsers /> },
                { path: "announcements", element: <Announce /> },
                { path: "profile", element: <AdminProfileSettings /> },
                { path: "", element: <Navigate to="halls" /> },
              ],
            },
          ],
        },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ];

  const router = useRoutes(routes);
  return router;
}

export default App;
