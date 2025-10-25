import "./AdminProfileSettings.css";
import { useState, useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import tokenContext from "../../contexts/TokenContext";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function AdminProfileSettings() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  const [token] = useContext(tokenContext);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch admin info on mount
  useEffect(() => {
    async function fetchAdminInfo() {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        };
        const res = await axios.get(`${BASE_URL}/admin-api/admin-info`, config);
        setAdminInfo(res.data.admin);
        
        // Populate form with admin data
        setValue("name", res.data.admin.name || "");
        setValue("email", res.data.admin.email || "");
        setValue("phone", res.data.admin.phone || "");
        setValue("altPhone", res.data.admin.altPhone || "");
        
        setLoading(false);
      } catch (err) {
        setErrorMsg("Failed to load admin information.");
        console.error(err);
        setLoading(false);
      }
    }
    
    if (token) {
      fetchAdminInfo();
    }
  }, [token, setValue]);

  async function handleUpdateProfile(data) {
    try {
      setSuccessMsg("");
      setErrorMsg("");
      setMsg("");

      // Validate at least one field is changed
      if (
        data.name === adminInfo.name &&
        data.phone === adminInfo.phone &&
        data.altPhone === adminInfo.altPhone
      ) {
        setMsg("No changes to update.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const updateData = {
        name: data.name,
        phone: data.phone,
        altPhone: data.altPhone,
      };

      const res = await axios.put(
        `${BASE_URL}/admin-api/update-admin`,
        updateData,
        config
      );

      setSuccessMsg("Profile updated successfully!");
      setAdminInfo(res.data.admin);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to update profile."
      );
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="adminProfileSettings">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="adminProfileSettings">
      <h1>Admin Profile Settings</h1>
        <div className="profileInfo d-flex">
          <div className="infoSection">
            <h2>Account Information</h2>
            
            {successMsg && <p className="success">{successMsg}</p>}
            {errorMsg && <p className="error">{errorMsg}</p>}
            {msg && <p className="message">{msg}</p>}

            <form onSubmit={handleSubmit(handleUpdateProfile)}>
              <div className="formGroup">
                <label htmlFor="name">Full Name:</label>
                <input
                  type="text"
                  id="name"
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 2, message: "Name must be at least 2 characters" },
                  })}
                />
                {errors.name && <p className="fieldError">{errors.name.message}</p>}
              </div>

              <div className="formGroup">
                <label htmlFor="email">Email Address:</label>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  disabled
                  title="Email cannot be changed"
                />
                <small>Email address cannot be changed</small>
              </div>

              <div className="formGroup">
                <label htmlFor="phone">Phone Number:</label>
                <input
                  type="tel"
                  id="phone"
                  {...register("phone", {
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Phone number must be 10 digits",
                    },
                  })}
                  placeholder="10 digit number"
                />
                {errors.phone && <p className="fieldError">{errors.phone.message}</p>}
              </div>

              <div className="formGroup">
                <label htmlFor="altPhone">Alternate Phone Number (Optional):</label>
                <input
                  type="tel"
                  id="altPhone"
                  {...register("altPhone", {
                    pattern: {
                      value: /^[0-9]{10}$|^$/,
                      message: "Alternate phone number must be 10 digits or empty",
                    },
                  })}
                  placeholder="10 digit number (optional)"
                />
                {errors.altPhone && <p className="fieldError">{errors.altPhone.message}</p>}
              </div>

              <div className="managedBlocksInfo">
                <h3>Managed Blocks</h3>
                <div className="blocksList">
                  {adminInfo.manages && adminInfo.manages.length > 0 ? (
                    adminInfo.manages.map((block) => (
                      <span key={block} className="blockBadge">
                        {block}
                      </span>
                    ))
                  ) : (
                    <p>No blocks assigned</p>
                  )}
                </div>
                <small>Contact superadmin to change managed blocks</small>
              </div>

              <div className="formButtons">
                <button type="submit" className="updateBtn">
                  Update Profile
                </button>
              </div>
            </form>
          </div>
       
      </div>
    </div>
  );
}

export default AdminProfileSettings;
