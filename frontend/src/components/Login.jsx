import "./Login.css";
import { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { userContext } from "../contexts/UserContext";
import tokenContext from "../contexts/TokenContext";
import axios from "axios";
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  User,
  Shield,
  Sparkles
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Login() {
  let {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      userType: "user",
    },
  });

  let [msg, setMsg] = useState("");
  let [isLoading, setIsLoading] = useState(false);
  let [user, setUser] = useContext(userContext);
  let [isAuthenticated, setIsAuthenticated] = useContext(tokenContext);
  let navigate = useNavigate();

  const selectedUserType = watch("userType");

  async function handleFormSubmit(userData) {
    setIsLoading(true);
    setMsg("");
    
    try {
      let res;
      if (userData.userType === "user") {
        res = await axios.post(`${BASE_URL}/user-api/login`, userData, { withCredentials: true });
        setIsAuthenticated(true);
      } else {
        res = await axios.post(`${BASE_URL}/admin-api/login`, userData, { withCredentials: true });
        setIsAuthenticated(true);
      }

      if (res.data.message && res.data.message.toLowerCase().includes("login successful")) {
        setUser(res.data.user);
        setMsg({ type: 'success', text: 'Login successful! Redirecting...' });
        
        setTimeout(() => {
          if (userData.userType === "user") {
            navigate("/userprofile");
          } else {
            navigate("/adminprofile");
          }
        }, 1000);
      } else {
        setMsg({ type: 'error', text: res.data.message || "Login failed" });
      }
    } catch (error) {
      setMsg({ type: 'error', text: error.response?.data?.message || "Login failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login">
        <div className="login-header">
          <div className="logo-wrapper">
            <Sparkles size={48} strokeWidth={1.5} className="logo-icon" />
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="usertype-container">
            <label className={`usertype-option ${selectedUserType === 'user' ? 'active' : ''}`}>
              <input 
                type="radio" 
                id="user" 
                value="user" 
                {...register("userType", { required: true })} 
              />
              <div className="usertype-content">
                <User size={24} />
                <span>User</span>
              </div>
            </label>
            
            <label className={`usertype-option ${selectedUserType === 'admin' ? 'active' : ''}`}>
              <input 
                type="radio" 
                id="admin" 
                value="admin" 
                {...register("userType", { required: true })} 
              />
              <div className="usertype-content">
                <Shield size={24} />
                <span>Admin</span>
              </div>
            </label>
          </div>
          {errors.userType && (
            <span className="login-error-message">
              <AlertCircle size={14} />
              Usertype is required
            </span>
          )}

          <div className="login-form-group">
            <label htmlFor="email">
              <Mail size={16} />
              Email
            </label>
            <input 
              type="email" 
              id="email" 
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email" 
              {...register("email", { required: true })} 
            />
            {errors.email && (
              <span className="login-error-message">
                <AlertCircle size={14} />
                Email is required
              </span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="password">
              <Lock size={16} />
              Password
            </label>
            <input 
              type="password" 
              id="password"
              className={errors.password ? 'error' : ''} 
              placeholder="Enter your password" 
              {...register("password", { required: true })} 
            />
            {errors.password && (
              <span className="login-error-message">
                <AlertCircle size={14} />
                Password is required
              </span>
            )}
          </div>

          {msg && (
            <div className={`login-message ${msg.type}`}>
              {msg.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              {typeof msg === 'string' ? msg : msg.text}
            </div>
          )}

          <button 
            type="submit" 
            className="login-submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="spinner" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Submit
              </>
            )}
          </button>

          <div className="login-footer">
            <p>Don't have an account?</p>
            <a href="/registration" className="register-link">
              Create Account
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;