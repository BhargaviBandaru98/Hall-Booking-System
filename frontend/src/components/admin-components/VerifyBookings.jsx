import "./VerifyBookings.css";
import axios from "axios";
import { useState, useEffect } from "react";
import BookingDetails from "../BookingDetails";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function VerifyBookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [selectedBookingForReject, setSelectedBookingForReject] = useState(null);
  
  // Accept modal states
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptNote, setAcceptNote] = useState("");
  const [selectedBookingForAccept, setSelectedBookingForAccept] = useState(null);
  
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
        { note: acceptNote },
        { withCredentials: true }
      );
      alert(response.data.message || "Booking verified successfully!");
      setBookings(prev => prev.filter(b => b.bookingID !== bookingID));
      setShowAcceptModal(false);
      setAcceptNote("");
      setSelectedBookingForAccept(null);
    } catch (error) {
      console.error("Error verifying booking:", error);
      alert("Failed to verify booking. Please try again.");
    }
  }

async function rejectBooking(bookingID) {
  try {
    const response = await axios.put(
      `${BASE_URL}/admin-api/reject-booking/${bookingID}`,
      { note: rejectNote },
      { withCredentials: true }
    );
    alert(response.data.message || "Booking rejected successfully!");
    setBookings(prev => prev.filter(b => b.bookingID !== bookingID));
    setShowRejectModal(false);
    setRejectNote("");
    setSelectedBookingForReject(null);
  } catch (error) {
    console.error("Error rejecting booking:", error);
    alert("Failed to reject booking. Please try again.");
  }
}

function handleRejectClick(booking) {
  setSelectedBookingForReject(booking);
  setShowRejectModal(true);
  setRejectNote("");
}

function handleConfirmReject() {
  if (selectedBookingForReject) {
    rejectBooking(selectedBookingForReject.bookingID);
  }
}

function handleCancelReject() {
  setShowRejectModal(false);
  setRejectNote("");
  setSelectedBookingForReject(null);
}

function handleAcceptClick(booking) {
  setSelectedBookingForAccept(booking);
  setShowAcceptModal(true);
  setAcceptNote("");
}

function handleConfirmAccept() {
  if (selectedBookingForAccept) {
    verifyBooking(selectedBookingForAccept.bookingID);
  }
}

function handleCancelAccept() {
  setShowAcceptModal(false);
  setAcceptNote("");
  setSelectedBookingForAccept(null);
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
              <th>Club</th>
              <th>Booking Email</th>
              <th>Hall</th>
              <th>Date</th>
              <th>Slot</th>
              <th>Verify</th>
              <th>Reject</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length ? (
              bookings.map((booking, idx) => (
                <tr key={idx} className="row">
                  <td onClick={() => showDetails(booking)}>{booking.club || 'NA'}</td>
                  <td onClick={() => showDetails(booking)}>{booking.bookingEmail}</td>
                  <td onClick={() => showDetails(booking)}>{booking.hallname}</td>
                  <td onClick={() => showDetails(booking)}>{booking.formattedDate || booking.date}</td>
                  <td style={{ textTransform: "uppercase" }} onClick={() => showDetails(booking)}>{booking.slot}</td>
                  <td><div className="verify" onClick={() => handleAcceptClick(booking)}>✔</div></td>
                  <td><div className="reject" onClick={() => handleRejectClick(booking)}>X</div></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No bookings available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="rejectModalBackdrop" onClick={handleCancelReject}>
          <div className="rejectModal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject Booking</h2>
            <p>Hall: <strong>{selectedBookingForReject?.hallname}</strong></p>
            <p>Date: <strong>{selectedBookingForReject?.date}</strong></p>
            
            <label htmlFor="rejectNote">Add a note (optional):</label>
            <textarea
              id="rejectNote"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows="4"
            />
            
            <div className="rejectModalButtons">
              <button className="confirmBtn" onClick={handleConfirmReject}>Confirm Rejection</button>
              <button className="cancelBtn" onClick={handleCancelReject}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="acceptModalBackdrop" onClick={handleCancelAccept}>
          <div className="acceptModal" onClick={(e) => e.stopPropagation()}>
            <h2>Accept Booking</h2>
            <p>Hall: <strong>{selectedBookingForAccept?.hallname}</strong></p>
            <p>Date: <strong>{selectedBookingForAccept?.date}</strong></p>
            
            <label htmlFor="acceptNote">Add a note (optional):</label>
            <textarea
              id="acceptNote"
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
              placeholder="Enter any additional notes..."
              rows="4"
            />
            
            <div className="acceptModalButtons">
              <button className="confirmBtn acceptConfirmBtn" onClick={handleConfirmAccept}>Confirm Accept</button>
              <button className="cancelBtn" onClick={handleCancelAccept}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedRow && <BookingDetails selectedRow={selectedRow} setSelectedRow={setSelectedRow} />}
    </div>
  );
}

export default VerifyBookings;
