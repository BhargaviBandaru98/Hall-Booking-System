import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { TokenContextProvider } from "./contexts/tokenContext.jsx";
import UserContextProvider from './contexts/UserContextProvider.jsx';

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
