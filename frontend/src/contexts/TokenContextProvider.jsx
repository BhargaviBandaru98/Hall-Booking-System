import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";
import { TokenContextProvider } from "./tokenContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <TokenContextProvider>
    <App />
  </TokenContextProvider>
);
