import { createContext, useState, useEffect } from "react";
import axios from "axios";

const tokenContext = createContext();

export const TokenContextProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  return <tokenContext.Provider value={[token, setToken]}>{children}</tokenContext.Provider>;
};

export default tokenContext;
