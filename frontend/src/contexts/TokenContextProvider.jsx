import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";
import { TokenContextProvider } from "./TokenContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <TokenContextProvider>
    <App />
  </TokenContextProvider>
);
