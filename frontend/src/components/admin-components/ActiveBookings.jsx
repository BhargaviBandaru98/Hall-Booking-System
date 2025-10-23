import "./ActiveBookings.css";
import "react-calendar/dist/Calendar.css"; 
import axios from "axios";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { useContext } from "react";
import tokenContext from "../../contexts/TokenContext";
import BookingDetails from "../BookingDetails";
const BASE_URL = import.meta.env.VITE_BASE_URL;

function ActiveBookings() {
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  let [token, setToken] = useContext(tokenContext);
  let [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    async function getHalls() {
      let res = await axios.get(`${BASE_URL}/admin-api/halls`);
      setHalls(res.data.halls);
    }
    getHalls();
  }, []);

async function handleSelection(hallname) {
  try {
    let config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };  
    let res = await axios.get(`${BASE_URL}/admin-api/hall-bookings/${hallname}`, {}, config);

    // Filter out rejected bookings and only keep active ones
    let filteredBookings = res.data.bookings.filter(
      b => b.activeStatus === true && b.rejectStatus !== true
    );

    let sortedBookings = filteredBookings.sort((a, b) => {
      let dateA = new Date(a.date);
      let dateB = new Date(b.date);
      return dateA - dateB;
    });

    setBookings(sortedBookings);
  }
  catch(err){
    console.log(err);
  }
}

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const dateBookings = bookings.filter(
        (b) => new Date(b.date).toDateString() === date.toDateString() && b.activeStatus == true && b.rejectStatus===false
      );
      const hasFN = dateBookings.some((b) => b.slot === "fn");
      const hasAN = dateBookings.some((b) => b.slot === "an");

      if (hasFN && hasAN) {
        return <><div className="semicircle fn">FN</div><div className="semicircle an">AN</div></>; 
      } else if (hasFN) {
        return <div className="semicircle fn">FN</div>;
      } else if (hasAN) {
        return <div className="semicircle an">AN</div>; 
      }
    }
    return null;
  };

async function blockBooking(bookingObj) {
  const confirmMsg = `Are you sure you want to block this booking?\n\n` +
                     `Booking Email: ${bookingObj.bookingEmail}\n` +
                     `Hall: ${bookingObj.hallname}\n` +
                     `Date: ${bookingObj.date}\n` +
                     `Slot: ${bookingObj.slot.toUpperCase()}`;

  if (!window.confirm(confirmMsg)) {
    return; // User cancelled
  }

  try {
    let config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    const res = await axios.put(
      `${BASE_URL}/admin-api/block-booking/${bookingObj.bookingID}`,
      {},
      {withCredentials:true}
    );

    if (res.data.message.toLowerCase().includes("blocked")) {
      setBookings(prevBookings =>
        prevBookings.map(b =>
          b.bookingID === bookingObj.bookingID ? { ...b, activeStatus: false } : b
        )
      );
      alert("Booking has been blocked.");
    } else {
      // Handle other responses if needed
      alert(res.data.message);
    }
  } catch (err) {
    console.error("Error blocking booking:", err);
    alert("Failed to block booking. Please try again.");
  }
}


  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="activebookings">
      <h1>Active Bookings</h1>
      <div className="content">
        <div className="select-calendar">
          <div className="selecthall">
            <select id="hallname" defaultValue="" onChange={(e) => handleSelection(e.target.value)} name="hallname">
              <option value="" disabled>--Select hall--</option>
              <option value="all">All Halls</option>
              {halls.map((hall, idx) => (
                <option key={idx} value={hall.name}>{hall.name}</option>
              ))}
            </select>
          </div>
          <div className="calendar-container">
            <Calendar
              minDate={new Date()}
              maxDate={new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)}
              minDetail="year"
              tileContent={tileContent}
            />
          </div>
        </div>
        <div className="tablecontainer">
          <table>
            <thead>
              <tr>
                <th>Booking Email</th>
                <th>Hall</th>
                <th>Date</th>
                <th>Slot</th>
                <th>Block</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((booking, idx) => (
                  <tr key={idx} className={booking.activeStatus == false ? "row blockedRow" : "row"}>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.bookingEmail}</td>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.hallname}</td>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.date}</td>
                    <td style={{textTransform: "uppercase"}} onClick={()=>setSelectedRow(booking)}>{booking.slot}</td>
                    <td>
                          {booking.activeStatus === true &&
                          booking.verifyStatus === true &&
                          (booking.rejectStatus === false || booking.rejectStatus === undefined) &&
                          new Date(booking.date) >= today ? (
                            <div className="block" onClick={() => blockBooking(booking)}>🚫︎</div>
                          ) : (
                            <p>Completed</p>
                          )}
                        </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No bookings available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedRow && <BookingDetails selectedRow={selectedRow} setSelectedRow={setSelectedRow}/>}
      </div>
    </div>
  );
}

export default ActiveBookings;