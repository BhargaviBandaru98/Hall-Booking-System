import "./Registration.css";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Registration() {
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState(null); // 'user' or 'admin'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Separate form for admin registration
  const { register: adminRegister, handleSubmit: handleAdminSubmit, reset: resetAdmin, formState: { errors: adminErrors } } = useForm();
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
    try {
      // For user registration only the specified fields are required
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

      // Ensure required fields per spec
      const required = ["club", "phone", "role", "email", "password"];
      for (const r of required) {
        if (!payload[r]) throw new Error(`${r} is required`);
      }

      const res = await axios.post(`${BASE_URL}/user-api/user`, payload);
      alert(res.data.message || "Registration submitted");
      setMsg(res.data.message);
      reset();
      setMode(null);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to register. Please try again.";
      alert(errorMsg);
      setMsg(errorMsg);
    }
  }
  
  return (
    <div className="registration">
      <h1>Register</h1>

      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => setMode("user")}>Register as User</button>
        <button type="button" onClick={() => setMode("admin")} style={{ marginLeft: 8 }}>Register as Admin</button>
      </div>

      {mode === null && <p>Please choose whether you are registering as a User or Admin.</p>}

      {mode === "user" && (
        <form action="" onSubmit={handleSubmit(handleFormSubmit)}>
          <label htmlFor="role">Role:</label>
          <select id="role" {...register("role", { required: true })}>
            <option value="">Select role</option>
            <option value="head">head</option>
            <option value="coordinator">coordinator</option>
          </select>
          {errors.role?.type === "required" && <p>*Role is required</p>}

          <label htmlFor="club">Club:</label>
          <input
            type="text"
            id="club"
            placeholder="Enter your club name"
            {...register("club", { required: true })}
          />
          {errors.club?.type === "required" && <p>*Club is required</p>}

          <label htmlFor="phone">Phone Number:</label>
          <input type="tel" id="phone" {...register("phone", { required: true })} />
          {errors.phone && <p>*Phone is required</p>}

          <label htmlFor="email">Official Club Email:</label>
          <input
            type="email"
            id="email"
            placeholder="Enter official club email"
            {...register("email", { required: true })}
          />
          {errors.email?.type === "required" && <p>*Email is required</p>}

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            {...register("password", { required: true })}
          />
          {errors.password?.type === "required" && <p>*Password is required</p>}

          <p className="para">{msg}</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button type="submit">Submit</button>
            <button type="button" onClick={() => setMode(null)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
          
        </form>
      )}
      {mode === "admin" && (
        <form onSubmit={handleAdminSubmit(async (data) => {
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
              throw new Error('name, email, phone and password are required');
            }
            const res = await axios.post(`${BASE_URL}/admin-api/create-admin`, payload);
            alert(res.data?.message || 'Admin registered');
            resetAdmin();
            setMode(null);
          } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to create admin';
            alert(errorMsg);
          }
        })}>
          <label>Name:</label>
          <input type="text" {...adminRegister("name", { required: true })} />
          {adminErrors.name && <p>*Name required</p>}

          <label>Official Email:</label>
          <input type="email" {...adminRegister("email", { required: true })} />
          {adminErrors.email && <p>*Email required</p>}

          <label>Password:</label>
          <input type="password" {...adminRegister("password", { required: true, minLength: 6 })} />
          {adminErrors.password && <p>*Password required (min 6 chars)</p>}

          <label>Phone Number:</label>
          <input type="tel" {...adminRegister("phone", { required: true })} />
          {adminErrors.phone && <p>*Phone required</p>}

          <label>Alternate Phone (optional):</label>
          <input type="tel" {...adminRegister("altPhone")} />

          <label>Blocks / Halls to manage</label>
          <div style={{ marginBottom: 8 }}>
            {blocks.length === 0 && <small>No blocks available</small>}
            {blocks.map((b) => (
              <label key={b} style={{ display: 'block' }}>
                <input type="checkbox" value={b} {...adminRegister("manages")} /> {b}
              </label>
            ))}
          </div>

          <p className="para">{msg}</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button type="submit">Create Admin</button>
            <button type="button" onClick={() => setMode(null)} style={{ marginLeft: 4 }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Registration;
