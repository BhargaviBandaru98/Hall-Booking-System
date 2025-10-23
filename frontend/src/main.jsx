import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { TokenContextProvider } from "./contexts/TokenContext.jsx";
import UserContextProvider from './contexts/UserContextProvider.jsx';
import axios from 'axios';

// Always include credentials so httpOnly cookies are sent with requests
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TokenContextProvider>
      <UserContextProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserContextProvider>
    </TokenContextProvider>
  </StrictMode>
);
