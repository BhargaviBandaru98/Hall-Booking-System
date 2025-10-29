import { createContext, useState, useEffect } from "react";
import axios from "axios";

const tokenContext = createContext();

export const TokenContextProvider = ({ children }) => {
  // Instead of managing the token directly, we'll just track authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Configure axios defaults
    axios.defaults.withCredentials = true; // This ensures cookies are sent with requests
  }, []);

  return <tokenContext.Provider value={[isAuthenticated, setIsAuthenticated]}>{children}</tokenContext.Provider>;
};

export default tokenContext;