import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Announce.css";

function Announce() {
  const [showHome, setShowHome] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [validityOption, setValidityOption] = useState("24"); // default: 24 hours
  const [customValidity, setCustomValidity] = useState("");
  const [notifyMail, setNotifyMail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  const [announcements, setAnnouncements] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Setup WebSocket connection to get live announcements updates
  useEffect(() => {
    const ws = new WebSocket("wss://vnr-campus-hall-bookings.onrender.com/ws");

    ws.onopen = () => {
      console.log("WebSocket connected for announcements");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Server error:", data.error);
          return;
        }
        if (data.type === "announcement") {
          setAnnouncements(data.announcements);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket connection closed for announcements");

    return () => ws.close();
  }, []);

  if (showHome) {
    return <Home />;
  }

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setResponseMessage("");

  let validityHours = validityOption;
  if (validityOption === "custom") {
    validityHours = customValidity;
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/admin-api/create-announcement`,
      {
        title,
        message,
        validity: validityHours,
        notifyMail,
      },
      { withCredentials: true }
    );
    setResponseMessage(response.data.message || "Announcement created successfully!");
    alert("Announcement Created");
    setTitle("");
    setMessage("");
    setValidityOption("24");
    setCustomValidity("");
    setNotifyMail(true);
  } catch (error) {
    // Log full error object for debugging
    console.error("Full axios error object:", error);

    // Log server response if available
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response received
      console.error("No response received:", error.request);
    } else {
      // Something else happened in setting up the request
      console.error("Error message:", error.message);
    }

    setResponseMessage(
      error.response?.data?.message || "Error creating announcement. Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  const handleDelete = async (announcementId, announcementTitle) => {
    if (window.confirm(`Are you sure you want to delete the announcement: "${announcementTitle}"?`)) {
      try {
        setDeleteLoading(true);
        await axios.delete(`${import.meta.env.VITE_BASE_URL}/admin-api/delete-announcement/${announcementId}`, {
          withCredentials: true,
        });
        setAnnouncements((prev) => prev.filter((ann) => ann._id !== announcementId));
      } catch (err) {
        console.error("Error deleting announcement:", err);
        alert("Error deleting announcement. Please try again.");
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  // Utility to check if announcement is deletable by validity period
  function isDeletable(announcement) {
    const { date, time } = announcement.createdAt; // e.g. "05/09/2025", "17:56:13"
    const validityHours = Number(announcement.validity);

    const [day, month, year] = date.split("/").map(Number);
    const [hour, minute, second] = time.split(":").map(Number);

    const createdAtDate = new Date(year, month - 1, day, hour, minute, second);
    const expiryDate = new Date(createdAtDate.getTime() + validityHours * 3600 * 1000);

    const now = new Date();

    return now < expiryDate;
  }

  // Helper to get Date object of creation time for sorting
  function getCreatedAtDate(announcement) {
    const { date, time } = announcement.createdAt;
    const [day, month, year] = date.split("/").map(Number);
    const [hour, minute, second] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Sort announcements: valid ones on top (newest first), expired below
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const aDeletable = isDeletable(a);
    const bDeletable = isDeletable(b);
    if (aDeletable && !bDeletable) return -1; // a valid, b expired => a before b
    if (!aDeletable && bDeletable) return 1;  // b valid, a expired => b before a
    // Both same validity status: sort by recent creation first
    return getCreatedAtDate(b) - getCreatedAtDate(a);
  });

  return (
    <div className="announcement-containerr">
      <div className="announcement-header">
        <h2>Create Announcement</h2>
        <button className="close-btn" onClick={() => setShowHome(true)}>
          X
        </button>
      </div>

      <form className="announcement-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="announcement-title">Title</label>
          <input
            type="text"
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="announcement-message">Message</label>
          <input
            type="text"
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter announcement message"
            required
          />
        </div>

        <div className="form-group validity-group">
          <label htmlFor="validity">Announcement Validity</label>
          <select
            id="validity"
            value={validityOption}
            onChange={(e) => setValidityOption(e.target.value)}
            required
          >
            <option value="24">24 Hours</option>
            <option value="48">48 Hours</option>
            <option value="custom">Custom</option>
          </select>
          {validityOption === "custom" && (
            <input
              type="number"
              value={customValidity}
              onChange={(e) => setCustomValidity(e.target.value)}
              placeholder="Enter hours"
              required
              min="1"
            />
          )}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={notifyMail}
              onChange={(e) => setNotifyMail(e.target.checked)}
            />
            Notify Users through mail
          </label>
        </div>

        <div className="form-group form-actions">
          <button type="submit" disabled={loading}>
            {loading ? <span className="loader"></span> : "Create Announcement"}
          </button>
        </div>

        {responseMessage && <p className="response-message">{responseMessage}</p>}
      </form>

      <hr />

      <div className="announcement-list">
        <h3>Existing Announcements</h3>
        {sortedAnnouncements.length === 0 ? (
          <p>No announcements found.</p>
        ) : (
          <ul>
            {sortedAnnouncements.map((a) => {
              const deletable = isDeletable(a);
              return (
                <li key={a._id} className="announcement-item">
                  <div>
                    <strong>{a.title}</strong> (Valid for: {a.validity} hours)
                    <p>{a.message}</p>
                    <small style={{ color: "#666", fontSize: "0.85rem" }}>
                      Created At: {a.createdAt.date} {a.createdAt.time}
                    </small>
                  </div>
                  {deletable ? (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(a._id, a.title)}
                      disabled={deleteLoading}
                    >
                      Delete
                    </button>
                  ) : (
                    <button className="delete-btn" disabled title="Validity expired">
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Announce;
