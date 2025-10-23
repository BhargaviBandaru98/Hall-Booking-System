import "./Halls.css";
import AdminHallCard from "./AdminHallCard.jsx";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Halls() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm();

  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState(null);
  const [addHall, setAddHall] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [localBlockStatus, setLocalBlockStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function fetchWithCredentials(url, options = {}) {
    options.credentials = "include";
    options.headers = options.headers || {};
    if (!options.headers["Content-Type"] && options.body) {
      options.headers["Content-Type"] = "application/json";
    }
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error: ${res.statusText}`);
      }
      return res.json();
    } catch (err) {
      throw err;
    }
  }

  // Fetch halls on mount
  useEffect(() => {
    async function getHalls() {
      try {
        const data = await fetchWithCredentials(`${BASE_URL}/admin-api/halls`);
        setHalls(data.halls || []);
        setErrorMsg("");
      } catch (err) {
        setErrorMsg("Failed to fetch halls.");
        console.error(err);
      }
    }
    getHalls();
  }, []);

  // Populate form with hall data on select
  useEffect(() => {
    if (selectedHall) {
      setLocalBlockStatus(selectedHall.blockStatus || false);
      setValue("name", selectedHall.name);
      setValue("capacity", selectedHall.capacity);
      setValue("location", selectedHall.location);
      setValue("description", selectedHall.description);
    } else {
      reset();
      setMsg("");
      setLocalBlockStatus(false);
    }
  }, [selectedHall, setValue, reset]);

  useEffect(() => {
    if (
      errors.name?.type === "required" ||
      errors.capacity?.type === "required" ||
      errors.location?.type === "required" ||
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
      hallData.blockStatus = false;
      hallData.capacity = Number(hallData.capacity);

      await fetchWithCredentials(`${BASE_URL}/admin-api/hall`, {
        method: "POST",
        body: JSON.stringify(hallData),
      });
      closePopup();
      window.location.reload();
    } catch (err) {
      setErrorMsg("Failed to add hall.");
      console.error(err);
    }
  }

  // Update hall (save button)
  async function handleHallUpdate(hallData) {
    try {
      hallData._id = selectedHall._id;
      hallData.blockStatus = localBlockStatus;
      hallData.capacity = Number(hallData.capacity);

      await fetchWithCredentials(`${BASE_URL}/admin-api/hall/${selectedHall.name}`, {
        method: "PUT",
        body: JSON.stringify(hallData),
      });
      closePopup();
      window.location.reload();
    } catch (err) {
      setErrorMsg("Failed to update hall.");
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
      setErrorMsg("Failed to delete hall.");
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
  }

  return (
    <div className="halls">
      <h1>Halls / Auditoriums</h1>
      {errorMsg && <p className="error">{errorMsg}</p>}
      <div className="cards">
        {halls.map((hall, idx) => (
          <AdminHallCard
            key={idx}
            hall={hall}
            onClick={() => setSelectedHall(hall)}
            className="card"
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
                <label htmlFor="location">Location:</label>
                <input
                  type="text"
                  id="location"
                  {...register("location", { required: true })}
                />
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  {...register("description", { required: true })}
                />
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
      )}

      {/* Add modal: name editable */}
      {addHall && (
        <div className="popup">
          <div className="closepopup" onClick={closePopup} />
          <div className="popupbackground">
            <div className="popupcard">
              <form onSubmit={handleSubmit(handleAddHall)}>
                <label htmlFor="name">Hallname:</label>
                <input type="text" id="name" {...register("name", { required: true })} />
                <label htmlFor="capacity">Capacity:</label>
                <input type="number" id="capacity" min="1" {...register("capacity", { required: true })} />
                <label htmlFor="location">Location:</label>
                <input type="text" id="location" {...register("location", { required: true })} />
                <label htmlFor="description">Description:</label>
                <textarea id="description" rows={4} cols={60} {...register("description", { required: true })} />
                <p>{msg}</p>
                <div className="buttons">
                  <button className="edit" type="submit">Add Hall</button>
                  <p className="close" onClick={closePopup}>Close</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Halls;
