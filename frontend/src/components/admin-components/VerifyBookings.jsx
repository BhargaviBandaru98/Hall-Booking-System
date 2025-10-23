import "./VerifyBookings.css";
import axios from "axios";
import { useState, useEffect } from "react";
import BookingDetails from "../BookingDetails";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function VerifyBookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getBookings() {
      try {
        const res = await axios.get(`${BASE_URL}/admin-api/bookings`, { withCredentials: true });
        const nonVerified = res.data.bookings.filter(b => !b.verifyStatus && b.activeStatus);
        setBookings(nonVerified);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
        alert("Failed to load bookings.");
      }
    }
    getBookings();
  }, []);

  async function verifyBooking(bookingID) {
    try {
      const response = await axios.put(
        `${BASE_URL}/admin-api/verify-booking/${bookingID}`,
        {},
        { withCredentials: true }
      );
      alert(response.data.message || "Booking verified successfully!");
      setBookings(prev => prev.filter(b => b.bookingID !== bookingID));
    } catch (error) {
      console.error("Error verifying booking:", error);
      alert("Failed to verify booking. Please try again.");
    }
  }

async function rejectBooking(bookingID) {
  try {
    const response = await axios.put(
      `${BASE_URL}/admin-api/reject-booking/${bookingID}`,
      {},
      { withCredentials: true }
    );
    alert(response.data.message || "Booking rejected successfully!");
    setBookings(prev => prev.filter(b => b.bookingID !== bookingID));
  } catch (error) {
    console.error("Error rejecting booking:", error);
    alert("Failed to reject booking. Please try again.");
  }
}


  function showDetails(bookingData) {
    setSelectedRow(bookingData);
  }

  return (
    <div className="verifybookings">
      <h1>Verify Bookings</h1>
      <div className="tablecontainer">
        <table>
          <thead>
            <tr>
              <th>Booking Email</th>
              <th>Hall</th>
              <th>Date</th>
              <th>Slot</th>
              <th>Verify</th>
              <th>Block</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length ? (
              bookings.map((booking, idx) => (
                <tr key={idx} className="row">
                  <td onClick={() => showDetails(booking)}>{booking.bookingEmail}</td>
                  <td onClick={() => showDetails(booking)}>{booking.hallname}</td>
                  <td onClick={() => showDetails(booking)}>{booking.formattedDate || booking.date}</td>
                  <td style={{ textTransform: "uppercase" }} onClick={() => showDetails(booking)}>{booking.slot}</td>
                  <td><div className="verify" onClick={() => verifyBooking(booking.bookingID)}>✔</div></td>
                  <td><div className="reject" onClick={() => rejectBooking(booking.bookingID)}>X</div></td>
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
    </div>
  );
}

export default VerifyBookings;
