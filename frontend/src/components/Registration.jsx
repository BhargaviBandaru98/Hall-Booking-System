import "./Registration.css";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { 
  User, 
  Shield, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Phone,
  Mail,
  Lock,
  Building2,
  Users,
  UserCheck,
  Briefcase
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Registration() {
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { 
    register: adminRegister, 
    handleSubmit: handleAdminSubmit, 
    reset: resetAdmin, 
    formState: { errors: adminErrors } 
  } = useForm();
  
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    async function fetchBlocks() {
      try {
        const res = await axios.get(`${BASE_URL}/user-api/blocks`);
        if (res.data?.blocks) setBlocks(res.data.blocks);
      } catch (err) {
        console.warn("Failed to fetch blocks:", err?.message || err);
      }
    }
    if (mode === "admin") fetchBlocks();
  }, [mode]);

  async function handleFormSubmit(userData) {
    setIsLoading(true);
    try {
      const payload = {
        name: userData.name || `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
        firstname: userData.firstname,
        lastname: userData.lastname,
        club: userData.club,
        role: userData.role,
        phone: userData.phone,
        email: (userData.email || "").toLowerCase(),
        password: userData.password,
        userType: "user",
        verifyStatus: false,
        activeStatus: true,
      };

      const required = ["club", "phone", "role", "email", "password"];
      for (const r of required) {
        if (!payload[r]) throw new Error(`${r} is required`);
      }

      const res = await axios.post(`${BASE_URL}/user-api/user`, payload);
      setMsg({ type: 'success', text: res.data.message || "Registration successful!" });
      reset();
      setTimeout(() => setMode(null), 2000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to register. Please try again.";
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="registration-container">
      <div className="registration">
        <div className="header-section">
          <h1 className="main-title">Welcome</h1>
          <p className="subtitle">Join our community</p>
        </div>

        {mode === null && (
          <div className="mode-selection">
            <button 
              type="button" 
              className="mode-button user-mode"
              onClick={() => setMode("user")}
            >
              <User size={32} strokeWidth={1.5} />
              <span>Register as User</span>
            </button>
            <button 
              type="button" 
              className="mode-button admin-mode"
              onClick={() => setMode("admin")}
            >
              <Shield size={32} strokeWidth={1.5} />
              <span>Register as Admin</span>
            </button>
          </div>
        )}

        {mode === "user" && (
          <form className="registration-form" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="form-header">
              <User size={36} />
              <h2 className="form-title">User Registration</h2>
            </div>
            
            <div className="form-group">
              <label htmlFor="role">
                <Briefcase size={16} />
                Role
              </label>
              <select 
                id="role" 
                className={errors.role ? 'error' : ''}
                {...register("role", { required: true })}
              >
                <option value="">Select your role</option>
                <option value="head">Head</option>
                <option value="coordinator">Coordinator</option>
              </select>
              {errors.role && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Role is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="club">
                <Users size={16} />
                Club Name
              </label>
              <input
                type="text"
                id="club"
                className={errors.club ? 'error' : ''}
                placeholder="Enter your club name"
                {...register("club", { required: true })}
              />
              {errors.club && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Club name is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} />
                Phone Number
              </label>
              <input 
                type="tel" 
                id="phone"
                className={errors.phone ? 'error' : ''}
                placeholder="+91 "
                {...register("phone", { required: true })} 
              />
              {errors.phone && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Phone number is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Official Club Email
              </label>
              <input
                type="email"
                id="email"
                className={errors.email ? 'error' : ''}
                placeholder="club@example.com"
                {...register("email", { required: true })}
              />
              {errors.email && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Email is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                Password
              </label>
              <input
                type="password"
                id="password"
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                {...register("password", { required: true })}
              />
              {errors.password && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Password is required
                </span>
              )}
            </div>

            {msg && (
              <div className={`message ${msg.type}`}>
                {msg.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                {msg.text}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserCheck size={20} />
                    Register
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => { setMode(null); setMsg(""); }} 
                className="cancel-button"
              >
                <X size={20} />
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === "admin" && (
          <form className="registration-form" onSubmit={handleAdminSubmit(async (data) => {
            setIsLoading(true);
            try {
              const payload = {
                name: data.name,
                email: (data.email || "").toLowerCase(),
                phone: data.phone,
                altPhone: data.altPhone || null,
                manages: data.manages || [],
                password: data.password,
              };
              
              if (!payload.name || !payload.email || !payload.phone || !payload.password) {
                throw new Error('All fields except alternate phone are required');
              }
              
              const res = await axios.post(`${BASE_URL}/admin-api/create-admin`, payload);
              setMsg({ type: 'success', text: res.data?.message || 'Admin registered successfully!' });
              resetAdmin();
              setTimeout(() => setMode(null), 2000);
            } catch (err) {
              const errorMsg = err.response?.data?.message || err.message || 'Failed to create admin';
              setMsg({ type: 'error', text: errorMsg });
            } finally {
              setIsLoading(false);
            }
          })}>
            <div className="form-header">
              <Shield size={36} />
              <h2 className="form-title">Admin Registration</h2>
            </div>

            <div className="form-group">
              <label>
                <User size={16} />
                Full Name
              </label>
              <input 
                type="text"
                className={adminErrors.name ? 'error' : ''}
                placeholder="John Doe"
                {...adminRegister("name", { required: true })} 
              />
              {adminErrors.name && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Name is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                <Mail size={16} />
                Official Email
              </label>
              <input 
                type="email"
                className={adminErrors.email ? 'error' : ''}
                placeholder="admin@example.com"
                {...adminRegister("email", { required: true })} 
              />
              {adminErrors.email && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Email is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                <Lock size={16} />
                Password
              </label>
              <input 
                type="password"
                className={adminErrors.password ? 'error' : ''}
                placeholder="••••••••"
                {...adminRegister("password", { required: true, minLength: 6 })} 
              />
              {adminErrors.password && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Password required (min 6 characters)
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                <Phone size={16} />
                Phone Number
              </label>
              <input 
                type="tel"
                className={adminErrors.phone ? 'error' : ''}
                placeholder="+1 (555) 123-4567"
                {...adminRegister("phone", { required: true })} 
              />
              {adminErrors.phone && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  Phone number is required
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                <Phone size={16} />
                Alternate Phone <span className="optional">(optional)</span>
              </label>
              <input 
                type="tel"
                placeholder="+1 (555) 987-6543"
                {...adminRegister("altPhone")} 
              />
            </div>

            <div className="form-group">
              <label>
                <Building2 size={16} />
                Manage Blocks/Halls
              </label>
              <div className="checkbox-group">
                {blocks.length === 0 ? (
                  <p className="no-blocks">No blocks available</p>
                ) : (
                  blocks.map((b) => (
                    <label key={b} className="checkbox-label">
                      <input 
                        type="checkbox" 
                        value={b} 
                        {...adminRegister("manages")} 
                      />
                      <span className="checkbox-custom">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {b}
                    </label>
                  ))
                )}
              </div>
            </div>

            {msg && (
              <div className={`message ${msg.type}`}>
                {msg.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                {msg.text}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    Create Admin
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => { setMode(null); setMsg(""); }} 
                className="cancel-button"
              >
                <X size={20} />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Registration;