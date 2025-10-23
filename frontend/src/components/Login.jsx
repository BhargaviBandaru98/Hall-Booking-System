import "./Login.css";
import { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { userContext } from "../contexts/UserContext";
// Import default tokenContext and named provider
import tokenContext from "../contexts/tokenContext";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Login() {
  let {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      userType: "user",
    },
  });

  let [msg, setMsg] = useState("");
  let [user, setUser] = useContext(userContext);
  let [token, setToken] = useContext(tokenContext); // correctly used tokenContext
  let navigate = useNavigate();

  async function handleFormSubmit(userData) {
    try {
      let res;
      if (userData.userType === "user") {
        res = await axios.post(`${BASE_URL}/user-api/login`, userData, { withCredentials: true });
        if (res.data.token) {
          setToken(res.data.token);
        }
      } else {
        // Admin login code unchanged
        res = await axios.post(`${BASE_URL}/admin-api/login`, userData, { withCredentials: true });
        if (res.data.token) {
          setToken(res.data.token);
        }
      }

      // Robust success check: case-insensitive, partial match
      if (res.data.message && res.data.message.toLowerCase().includes("login successful")) {
        setUser(res.data.user);
        if (userData.userType === "user") {
          navigate("/userprofile");
        } else {
          navigate("/adminprofile");
        }
      } else {
        setMsg(res.data.message || "Login failed");
      }
    } catch (error) {
      setMsg(error.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="login">
      <h1>Login</h1>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="usertype">
          <div className="radio1 radio">
            <input type="radio" id="user" value="user" {...register("userType", { required: true })} />
            <label htmlFor="user">User</label>
          </div>
          <div className="radio2 radio">
            <input type="radio" id="admin" value="admin" {...register("userType", { required: true })} />
            <label htmlFor="admin">Admin</label>
          </div>
        </div>
        {errors.userType && <p>*Usertype is required</p>}
        <label htmlFor="email">Email:</label>
        <input type="email" id="email" placeholder="Enter your email" {...register("email", { required: true })} />
        {errors.email && <p>*Email is required</p>}
        <label htmlFor="password">Password:</label>
        <input type="password" id="password" placeholder="Enter your password" {...register("password", { required: true })} />
        {errors.password && <p>*Password is required</p>}
        <p className="para">{msg}</p>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default Login;
