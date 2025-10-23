import { createContext, useState, useEffect } from "react";

const tokenContext = createContext();

export const TokenContextProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  return <tokenContext.Provider value={[token, setToken]}>{children}</tokenContext.Provider>;
};

export default tokenContext;
