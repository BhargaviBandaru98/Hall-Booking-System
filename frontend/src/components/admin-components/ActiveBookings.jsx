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
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState("All");
  const [selectedHall, setSelectedHall] = useState("All");
  let [token, setToken] = useContext(tokenContext);
  let [selectedRow, setSelectedRow] = useState(null);
  const [filterDate, setFilterDate] = useState(null);

  useEffect(() => {
    async function getHalls() {
      let res = await axios.get(`${BASE_URL}/admin-api/halls`, { withCredentials: true });
      setHalls(res.data.halls);
      const uniqueBlocks = Array.from(new Set((res.data.halls || []).map(h => h.block).filter(Boolean)));
      setBlocks(uniqueBlocks);
    }
    getHalls();
  }, []);

  // Load today's bookings on initial load
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    handleSelection("All", today);
  }, []);

async function handleSelection(hallname, dateFilter = null) {
  try {
    let config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    
    let allBookings = [];
    
    // If 'All' halls selected, fetch from all selected block halls
    if (hallname === "All" || hallname === "") {
      if (selectedBlock && selectedBlock !== "All") {
        // Fetch bookings from halls in selected block only
        const hallsInBlock = halls.filter(h => h.block === selectedBlock).map(h => h.name);
        for (const hn of hallsInBlock) {
          try {
            let res = await axios.get(`${BASE_URL}/admin-api/hall-bookings/${hn}`, {}, config);
            allBookings.push(...res.data.bookings);
          } catch (err) {
            console.log(err);
          }
        }
      } else {
        // Fetch from all halls
        for (const h of halls) {
          try {
            let res = await axios.get(`${BASE_URL}/admin-api/hall-bookings/${h.name}`, {}, config);
            allBookings.push(...res.data.bookings);
          } catch (err) {
            console.log(err);
          }
        }
      }
    } else {
      // Fetch from specific hall
      let res = await axios.get(`${BASE_URL}/admin-api/hall-bookings/${hallname}`, {}, config);
      allBookings = res.data.bookings;
    }

    // Filter out rejected bookings and only keep active ones
    const today = dateFilter || new Date();
    today.setHours(0, 0, 0, 0);

    let filteredBookings = allBookings.filter(
      b => b.activeStatus === true && b.rejectStatus !== true && new Date(b.date) >= today
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


  return (
    <div className="activebookings">
      <h1>Active Bookings</h1>
      <div className="content">
        <div className="select-calendar">
          <div className="selecthall">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <select id="block" value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedHall("All"); setBookings([]); setFilterDate(null); handleSelection("All"); }}>
                <option value="All">All Blocks</option>
                {blocks.map((b, i) => (
                  <option key={i} value={b}>{b}</option>
                ))}
              </select>

              <select
                id="hallname"
                onChange={(e) => { setSelectedHall(e.target.value); handleSelection(e.target.value); setFilterDate(null); }}
                name="hallname"
                value={selectedHall}
              >
                <option value="All">All Halls</option>
                {halls
                  .filter(h => {
                    if (selectedBlock === 'All') return true;
                    return h.block === selectedBlock;
                  })
                  .map((hall, idx) => (
                    <option key={idx} value={hall.name}>
                      {hall.name}
                    </option>
                  ))}
              </select>
            </div>
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
                <th>Club</th>
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
                    <td onClick={()=>setSelectedRow(booking)}>{booking.club || 'NA'}</td>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.bookingEmail}</td>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.hallname}</td>
                    <td onClick={()=>setSelectedRow(booking)}>{booking.date}</td>
                    <td style={{textTransform: "uppercase"}} onClick={()=>setSelectedRow(booking)}>{booking.slot}</td>
                    <td>
                          {booking.activeStatus === true &&
                          booking.verifyStatus === true &&
                          (booking.rejectStatus === false || booking.rejectStatus === undefined) &&
                          new Date(booking.date) >= new Date(new Date().setHours(0,0,0,0)) ? (
                            <div className="block" onClick={() => blockBooking(booking)}>🚫︎</div>
                          ) : (
                            <p>Completed</p>
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
        {selectedRow && <BookingDetails selectedRow={selectedRow} setSelectedRow={setSelectedRow}/>}
      </div>
    </div>
  );
}

export default ActiveBookings;