import "./MyBookings.css";
import axios from "axios";
import { useState, useEffect, useContext } from "react";
import { userContext } from "../../contexts/UserContext";
import BookingDetails from "../BookingDetails";
import { useNavigate } from "react-router-dom";
const BASE_URL = import.meta.env.VITE_BASE_URL;

function MyBookings() {
  const [halls, setHalls] = useState([]);
  const [user] = useContext(userContext);
  const [bookings, setBookings] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getHalls() {
      try {
        const res = await axios.get(`${BASE_URL}/user-api/halls`, { withCredentials: true });
        setHalls(res.data.halls);
      } catch (error) {
        console.error("Failed to fetch halls:", error);
        alert("Failed to load halls data.");
      }
    }
    getHalls();
  }, []);

  useEffect(() => {
    async function getBookings() {
      if (!user?.email) return;
      try {
        const res = await axios.get(`${BASE_URL}/user-api/user-bookings/${user.email}`, { withCredentials: true });
        if (res.data.userBookings) {
          const sortedBookings = res.data.userBookings.sort((a, b) => new Date(b.date) - new Date(a.date));
          setBookings(sortedBookings);
        }
      } catch (err) {
        alert("Failed to load your bookings.");
      }
    }
    getBookings();
  }, [user]);

function openCancelModal(bookingObj) {
  setBookingToCancel(bookingObj);
  setCancelNote("");
  setShowCancelModal(true);
}

async function confirmCancel() {
  if (!bookingToCancel) return;
  try {
    const res = await axios.put(
      `${BASE_URL}/user-api/cancel-booking/${bookingToCancel.bookingID}`,
      { note: cancelNote },
      { withCredentials: true }
    );
    setBookings(prevBookings =>
      prevBookings.map(b =>
        b.bookingID === bookingToCancel.bookingID
          ? { ...b, activeStatus: false }
          : b
      )
    );
    setShowCancelModal(false);
    setBookingToCancel(null);
    alert(res.data.message || "Booking cancelled successfully.");
  } catch (err) {
    alert(err.response?.data?.message || "Failed to cancel booking. Please try again.");
  }
}

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="mybookings">
      <h1>My Bookings</h1>
      <div className="tablecontainer">
        <table>
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Hall</th>
              <th>Date</th>
              <th>Slot</th>
              <th>Verify Status</th>
              <th>Cancel</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((booking, idx) => (
                <tr key={idx} className="row">
                  <td onClick={() => setSelectedRow(booking)}>{idx + 1}</td>
                  <td onClick={() => setSelectedRow(booking)}>{booking.hallname}</td>
                  <td onClick={() => setSelectedRow(booking)}>
                    {booking.formattedDate || booking.date}
                  </td>
                  <td
                    style={{ textTransform: "uppercase" }}
                    onClick={() => setSelectedRow(booking)}
                  >
                    {booking.slot}
                  </td>
                  <td onClick={() => setSelectedRow(booking)}>
                    {!halls.find(hall => hall.name === booking.hallname) ? (
                      <p className="blocked">Hall Blocked / Removed</p>
                    ) : booking.rejectStatus === true ? (
                      <p className="blocked">Rejected</p>
                    ) : booking.activeStatus === false && booking.verifyStatus === true ? (
                      <p className="adminCancelled">Cancelled by Admin</p>
                    ) : booking.verifyStatus === false && booking.activeStatus === true ? (
                      <p className="pending">Pending...</p>
                    ) : booking.verifyStatus === true && booking.activeStatus === true ? (
                      <p className="approved">Approved</p>
                    ) : booking.verifyStatus === false && booking.activeStatus === false ? (
                      <p className="canceled">Cancelled</p>
                    ) : null}
                  </td>


                  <td>
                    {booking.activeStatus === true &&
                    halls.find(hall => hall.name === booking.hallname) ? (
                      <p className="cancel" onClick={() => openCancelModal(booking)}>
                        Cancel
                      </p>
                    ) : (
                      <p className="none">---</p>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No bookings available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedRow && <BookingDetails selectedRow={selectedRow} setSelectedRow={setSelectedRow} />}
      {showCancelModal && (
        <div className="cancel-modal">
          <div className="cancel-modal-card">
            <h2>Confirm Cancellation</h2>
            <p>Event Name: {bookingToCancel?.eventName || 'N/A'}</p>
            <p>Hall: {bookingToCancel?.hallname}</p>
            <p>Slot: {bookingToCancel?.slot}</p>
            <label>Cancellation Note: </label>
            <textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={4} style={{ width: '100%' }} />
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={confirmCancel} className="cancel-confirm" disabled={!cancelNote.trim()}>Confirm Cancel</button>
              <button onClick={() => setShowCancelModal(false)} className="cancel-cancel">Close</button>
              {!cancelNote.trim() && <span style={{ color: '#900', marginLeft: 8 }}>Cancellation note is required</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
