import "./Halls.css";
import AdminHallCard from "./AdminHallCard.jsx";
import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import tokenContext from "../../contexts/TokenContext";

const BASE_URL = import.meta.env.VITE_BASE_URL;
// const BASE_URL='http:localhost:4000';

function Halls() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm();

  const [isAuthenticated] = useContext(tokenContext);
  const [halls, setHalls] = useState([]);
  const [allHalls, setAllHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState(null);
  const [addHall, setAddHall] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [localBlockStatus, setLocalBlockStatus] = useState(false);
  const [showProjectorCountField, setShowProjectorCountField] = useState(false);
  const [showLaptopChargingField, setShowLaptopChargingField] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterType, setFilterType] = useState("myHalls");
  const [adminInfo, setAdminInfo] = useState(null);

  async function fetchWithCredentials(url, options = {}) {
    options.credentials = "include";  // This ensures cookies are sent with the request
    options.headers = options.headers || {};
    if (!options.headers["Content-Type"] && options.body) {
      options.headers["Content-Type"] = "application/json";
    }
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error: ${res.statusText}`);
        } else {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error(`Server returned ${res.status} ${res.statusText}`);
        }
      }
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Unexpected non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }
      return res.json();
    } catch (err) {
      console.error("Request failed:", err);
      throw err;
    }
  }

  // Fetch admin info and halls on mount
  useEffect(() => {
    async function getHalls() {
      try {
        const hallsData = await fetchWithCredentials(`${BASE_URL}/admin-api/halls`);
        console.log("Halls data:", hallsData);
        const allHallsList = hallsData.halls || []; // Changed from hallsData.allHalls to hallsData.halls
        setAllHalls(allHallsList);
        setHalls(allHallsList); // Show all halls by default since we can't filter without admin info
        setErrorMsg("");
      } catch (err) {
        setErrorMsg("Failed to fetch halls.");
        console.error("Error fetching halls:", err);
      }
    }
    getHalls();
  }, []);

  // Handle filter toggle
  const handleFilterChange = (type) => {
    setFilterType(type);
    if (type === "myHalls") {
      const myHallsList = allHalls.filter(hall => 
        adminInfo && adminInfo.manages && adminInfo.manages.includes(hall.block)
      );
      setHalls(myHallsList);
    } else {
      setHalls(allHalls);
    }
  }

  // Populate form with hall data on select
  useEffect(() => {
    if (selectedHall) {
      setLocalBlockStatus(selectedHall.blockStatus || false);
      setValue("name", selectedHall.name);
      setValue("capacity", selectedHall.capacity);
      // if location stored as 'Block,Floor' split for form
      if (selectedHall.location && selectedHall.location.includes(",")) {
        const parts = selectedHall.location.split(",");
        setValue("block", parts[0]);
        setValue("floor", parts[1]);
      } else {
        setValue("block", "");
        setValue("floor", "");
      }
      setValue("location", selectedHall.location);
      setValue("laptopCharging", selectedHall.laptopCharging ? "yes" : "no");
  setValue("projectorAvailable", selectedHall.projectorAvailable ? "yes" : "no");
  setValue("projectorCount", selectedHall.projectorCount || "");
  setShowProjectorCountField(Boolean(selectedHall.projectorAvailable));
      setValue("description", selectedHall.description);
      // image preview from existing hall (may be data URL or URL)
      setImagePreview(selectedHall.image || "");
      setImageBase64("");
    } else {
      reset();
      setMsg("");
      setLocalBlockStatus(false);
      setShowProjectorCountField(false);
      setImagePreview("");
      setImageBase64("");
    }
  }, [selectedHall, setValue, reset]);

  useEffect(() => {
    if (
      errors.name?.type === "required" ||
      errors.capacity?.type === "required" ||
      errors.block?.type === "required" ||
      errors.floor?.type === "required" ||
      errors.description?.type === "required"
    ) {
      setMsg("*All details are required");
    } else {
      setMsg("");
    }
  }, [errors]);

  // Add new hall (name is editable on add)
  async function handleAddHall(hallData) {
    try {
      // prepare payload
      hallData.blockStatus = false;
      hallData.capacity = Number(hallData.capacity);
      // concat block and floor into location string
      hallData.location = `${hallData.block || ""},${hallData.floor || ""}`;
      hallData.laptopCharging = hallData.laptopCharging === "yes";
      hallData.projectorAvailable = hallData.projectorAvailable === "yes";
      hallData.projectorCount = hallData.projectorAvailable ? Number(hallData.projectorCount || 0) : 0;
      // include image if provided
      if (imageBase64) {
        hallData.image = imageBase64;
      }

      await fetchWithCredentials(`${BASE_URL}/admin-api/hall`, {
        method: "POST",
        body: JSON.stringify(hallData),
      });
      closePopup();
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.message || "Failed to add hall.");
      console.error(err);
    }
  }

  // Update hall (save button)
  async function handleHallUpdate(hallData) {
    try {
      hallData._id = selectedHall._id;
      hallData.blockStatus = localBlockStatus;
      hallData.capacity = Number(hallData.capacity);
      // concat block and floor into location string
      hallData.location = `${hallData.block || ""},${hallData.floor || ""}`;
      hallData.laptopCharging = hallData.laptopCharging === "yes";
      hallData.projectorAvailable = hallData.projectorAvailable === "yes";
      hallData.projectorCount = hallData.projectorAvailable ? Number(hallData.projectorCount || 0) : 0;
      // image: if a new image was selected use base64, otherwise keep existing
      if (imageBase64) {
        hallData.image = imageBase64;
      } else if (selectedHall && selectedHall.image) {
        hallData.image = selectedHall.image;
      }

      await fetchWithCredentials(`${BASE_URL}/admin-api/hall/${selectedHall.name}`, {
        method: "PUT",
        body: JSON.stringify(hallData),
      });
      closePopup();
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update hall.");
      console.error(err);
    }
  }

  // Delete hall (with confirmation)
  async function handleDeleteHall() {
    try {
      await fetchWithCredentials(`${BASE_URL}/admin-api/hall/${selectedHall.name}`, {
        method: "DELETE",
      });
      setShowDeleteConfirm(false);
      closePopup();
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete hall.");
      console.error(err);
    }
  }

  // Modal and form resets
  function closePopup() {
    reset();
    setMsg("");
    setAddHall(false);
    setSelectedHall(null);
    setErrorMsg("");
    setShowDeleteConfirm(false);
    setShowProjectorCountField(false);
  }

  return (
    <div className="halls">
      <h1>Halls / Auditoriums</h1>
      {errorMsg && <p className="error">{errorMsg}</p>}
      
      {/* Filter buttons */}
      <div className="filterButtons" style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button 
          className={filterType === "myHalls" ? "filterBtn active" : "filterBtn"}
          onClick={() => handleFilterChange("myHalls")}
        >
          My Halls
        </button>
        <button 
          className={filterType === "allHalls" ? "filterBtn active" : "filterBtn"}
          onClick={() => handleFilterChange("allHalls")}
        >
          All Halls
        </button>
      </div>

      <div className="cards">
        {halls.map((hall, idx) => (
          <AdminHallCard
            key={idx}
            hall={hall}
            onClick={() => setSelectedHall(hall)}
            onEdit={() => setSelectedHall(hall)}
            className="card"
            canEdit={adminInfo && adminInfo.manages && adminInfo.manages.includes(hall.block)}
          />
        ))}
        <div className="addhallcard" onClick={() => setAddHall(true)}>
          <div className="details">
            <div className="circle">
              <div className="bar bar1" />
              <div className="bar bar2" />
              <div className="bar bar3" />
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal: name disabled, block/unblock is just local until Save */}
      {selectedHall && (
        <div className="popup">
          <div className="closepopup" onClick={closePopup} />
          <div className="popupbackground">
            <div className="popupcard">
              <div className="popupcontent">
                <form onSubmit={handleSubmit(handleHallUpdate)}>
                <div className="hallname-delete">
                  <label htmlFor="name">Hallname:</label>
                </div>
                {/* Hallname: Disabled on edit */}
                <input
                  type="text"
                  id="name"
                  {...register("name", { required: true })}
                  disabled
                />
                <label htmlFor="capacity">Capacity:</label>
                <input
                  type="number"
                  id="capacity"
                  min="1"
                  {...register("capacity", { required: true })}
                />

                <label htmlFor="block">Block:</label>
                <select id="block" {...register("block", { required: true })}>
                  <option value="">Select Block</option>
                  {adminInfo && adminInfo.manages && adminInfo.manages.map((block) => (
                    <option key={block} value={block}>{block}</option>
                  ))}
                </select>

                <label htmlFor="floor">Floor:</label>
                <input type="text" id="floor" {...register("floor", { required: true })} />

                <label htmlFor="laptopCharging">Laptop Charging Points:</label>
                <select id="laptopCharging" {...register("laptopCharging")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>

                <label htmlFor="projectorAvailable">Projectors / Smart Boards Available:</label>
                <select
                  id="projectorAvailable"
                  {...register("projectorAvailable")}
                  onChange={(e) => setShowProjectorCountField(e.target.value === "yes")}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>

                {showProjectorCountField && (
                  <>
                    <label htmlFor="projectorCount">Number of Projectors / Boards:</label>
                    <input type="number" id="projectorCount" min="0" {...register("projectorCount")} />
                  </>
                )}
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  {...register("description", { required: true })}
                />

                <label htmlFor="image">Image:</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      setImagePreview(result);
                      setImageBase64(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {imagePreview && (
                  <div style={{ marginTop: 10 }}>
                    <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', borderRadius: 6 }} />
                  </div>
                )}
                <label htmlFor="blockToggle" style={{ marginTop: "10px" }}>Status:</label>
                <button
                  type="button"
                  onClick={() => setLocalBlockStatus(!localBlockStatus)}
                  className={localBlockStatus ? "unblockBtn" : "blockBtn"}
                >
                  {localBlockStatus ? "Unblock Hall" : "Block Hall"}
                </button>
                <p>{msg}</p>
                <div className="buttons">
                  <button className="edit" type="submit">Save</button>
                  <button
                    className="delete"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ marginLeft: "10px", color: "red" }}
                  >
                    Delete
                  </button>
                  <p className="close" onClick={closePopup}>Close</p>
                </div>
                {/* Confirmation modal for delete */}
                {showDeleteConfirm && (
                  <div className="confirmModal">
                    <p>Are you sure you want to delete this hall?</p>
                    <button className="confirm" type="button" onClick={handleDeleteHall}>
                      Confirm
                    </button>
                    <button className="cancel" type="button" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal: name editable */}
      {addHall && (
        <div className="popup">
          <div className="closepopup" onClick={closePopup} />
          <div className="popupbackground">
            <div className="popupcard">
              <div className="popupcontent">
                <form onSubmit={handleSubmit(handleAddHall)}>
                <label htmlFor="name">Hallname:</label>
                <input type="text" id="name" {...register("name", { required: true })} />
                <label htmlFor="capacity">Capacity:</label>
                <input type="number" id="capacity" min="1" {...register("capacity", { required: true })} />

                <label htmlFor="block">Block:</label>
                <select id="block" {...register("block", { required: true })}>
                  <option value="">Select Block</option>
                  {adminInfo && adminInfo.manages && adminInfo.manages.map((block) => (
                    <option key={block} value={block}>{block}</option>
                  ))}
                </select>

                <label htmlFor="floor">Floor:</label>
                <input type="text" id="floor" {...register("floor", { required: true })} />

                <label htmlFor="laptopCharging">Laptop Charging Points:</label>
                <select id="laptopCharging" {...register("laptopCharging")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>

                <label htmlFor="projectorAvailable">Projectors / Smart Boards Available:</label>
                <select
                  id="projectorAvailable"
                  {...register("projectorAvailable")}
                  onChange={(e) => setShowProjectorCountField(e.target.value === "yes")}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>

                {showProjectorCountField && (
                  <>
                    <label htmlFor="projectorCount">Number of Projectors / Boards:</label>
                    <input type="number" id="projectorCount" min="0" {...register("projectorCount")} />
                  </>
                )}

                <label htmlFor="description">Description:</label>
                <textarea id="description" rows={4} cols={60} {...register("description", { required: true })} />
                <label htmlFor="image">Image:</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      setImagePreview(result);
                      setImageBase64(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {imagePreview && (
                  <div style={{ marginTop: 10 }}>
                    <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', borderRadius: 6 }} />
                  </div>
                )}
                <p>{msg}</p>
                <div className="buttons">
                  <button className="edit" type="submit">Add Hall</button>
                  <p className="close" onClick={closePopup}>Close</p>
                </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Halls;
