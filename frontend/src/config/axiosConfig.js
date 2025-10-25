import axios from "axios";

// Configure axios to always include credentials (cookies) in requests
axios.defaults.withCredentials = true;

// Configure default base URL
const BASE_URL = import.meta.env.VITE_BASE_URL;
axios.defaults.baseURL = BASE_URL;

// Add response interceptor to handle common errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Could add additional logic here for handling auth errors
      console.warn("Authentication error:", error.response?.status);
    }
    return Promise.reject(error);
  }
);

export default axios;
