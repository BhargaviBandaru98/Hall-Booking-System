import "./AllUsers.css";
import axios from "axios";
import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function AllUsers() {
  const [users, setUsers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

useEffect(() => {
  async function getUsers() {
    try {
      const res = await axios.get(`${BASE_URL}/admin-api/users`, { withCredentials: true });
      if (res.data && Array.isArray(res.data.users)) {
        const verifiedUsers = res.data.users.filter(
          u => u.verifyStatus === true 
        );
        setUsers(verifiedUsers);
        setErrorMsg("");
      } else {
        setUsers([]);
        setErrorMsg("No users data received from server");
      }
    } catch (err) {
      setErrorMsg("Failed to fetch users");
      setUsers([]);
    }
  }
  getUsers();
}, []);


async function blockUser(userObj) {
  try {
    await axios.put(`${BASE_URL}/admin-api/block-user/${userObj.email}`, {}, { withCredentials: true });

    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.email === userObj.email ? { ...u, activeStatus: u.activeStatus === false ? true : false } : u
      )
    );

    // Show success popup
    alert(`User ${userObj.email} has been ${userObj.activeStatus === false ? "unblocked" : "blocked"} successfully.`);
  } catch (err) {
    console.error("Failed to block/unblock user", err);
    // Show error popup
    alert("Failed to block/unblock user. Please try again.");
  }
}

  async function handleRowClick(user) {
    console.log("Row clicked:", user);
    setSelectedUserDetails(user);
    setLoadingBookings(true);
    setShowDetailModal(true);
    
    try {
      console.log("Fetching bookings for email:", user.email);
      const res = await axios.get(`${BASE_URL}/admin-api/user-bookings/${user.email}`, { withCredentials: true });
      console.log("Bookings response:", res.data);
      setUserBookings(res.data.bookings || []);
    } catch (err) {
      console.error("Failed to fetch user bookings:", err);
      setUserBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }

  function closeDetailModal() {
    setShowDetailModal(false);
    setSelectedUserDetails(null);
    setUserBookings([]);
  }

  return (
    <div className="allusers">
      <h1>All Users</h1>
      {errorMsg && <p className="error">{errorMsg}</p>}
      <div className="tablecontainer">
        <table>
          <thead>
            <tr>
              <th>Club</th>
              <th>Email</th>
              <th>Role</th>
              <th>Block</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, idx) => (
                <tr key={idx} className={user.activeStatus === false ? "blockedRow row" : "row"} onClick={() => handleRowClick(user)}>
                  <td>{user.club}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="block" onClick={() => blockUser(user)}>
                      🚫︎
                    </div>
                  </td>
                  <td>
                    <span className={user.activeStatus === false ? "status-blocked" : "status-active"}>
                      {user.activeStatus === false ? "Blocked" : "Active"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No Users Available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showDetailModal && selectedUserDetails && (
        <div className="userDetailModalBackdrop" onClick={closeDetailModal}>
          <div className="userDetailModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>User Details</h2>
              <button className="closeBtn" onClick={closeDetailModal}>✕</button>
            </div>

            <div className="userInfoSection">
              <h3>Personal Information</h3>
              <div className="infoGrid">
                <div className="infoItem">
                  <label>First Name:</label>
                  <p>{selectedUserDetails.firstname || "N/A"}</p>
                </div>
                <div className="infoItem">
                  <label>Last Name:</label>
                  <p>{selectedUserDetails.lastname || "N/A"}</p>
                </div>
                <div className="infoItem">
                  <label>Email:</label>
                  <p>{selectedUserDetails.email}</p>
                </div>
                <div className="infoItem">
                  <label>Club:</label>
                  <p>{selectedUserDetails.club || "N/A"}</p>
                </div>
                <div className="infoItem">
                  <label>Role:</label>
                  <p>{selectedUserDetails.role || "N/A"}</p>
                </div>
                <div className="infoItem">
                  <label>Status:</label>
                  <p className={selectedUserDetails.activeStatus === false ? "status-blocked" : "status-active"}>
                    {selectedUserDetails.activeStatus === false ? "Blocked" : "Active"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bookingsSection">
              <h3>Booking History ({loadingBookings ? "Loading..." : userBookings.length})</h3>
              {loadingBookings ? (
                <p className="loading">Loading bookings...</p>
              ) : userBookings.length > 0 ? (
                <div className="bookingsTable">
                  <table>
                    <thead>
                      <tr>
                        <th>Hall</th>
                        <th>Date</th>
                        <th>Slot</th>
                        <th>Status</th>
                        <th>Verify Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userBookings.map((booking, idx) => (
                        <tr key={idx}>
                          <td>{booking.hallname}</td>
                          <td>{booking.formattedDate || booking.date}</td>
                          <td style={{ textTransform: "uppercase" }}>{booking.slot}</td>
                          <td>
                            <span className={booking.activeStatus === false ? "badge-blocked" : "badge-active"}>
                              {booking.activeStatus === false ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td>
                            <span className={booking.verifyStatus === true ? "badge-verified" : "badge-pending"}>
                              {booking.verifyStatus === true ? "Verified" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="noBookings">No bookings found for this user</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllUsers;
