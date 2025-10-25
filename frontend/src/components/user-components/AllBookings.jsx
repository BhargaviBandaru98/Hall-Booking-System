import "./AllBookings.css";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { useOutletContext, useNavigate } from "react-router-dom";
import BookingDetails from "../BookingDetails";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function AllBookings() {
  const [halls, setHalls] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const { setSelected, selectedDate, setSelectedDate, selectedHall, setSelectedHall } = useOutletContext();
  const navigate = useNavigate();
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    async function getHalls() {
      try {
        const res = await axios.get(`${BASE_URL}/user-api/halls`, { withCredentials: true });
        setHalls(res.data.halls);
        const uniqueBlocks = Array.from(new Set((res.data.halls || []).map(h => h.location && h.location.split(',')[0]).filter(Boolean)));
        setBlocks(uniqueBlocks);
      } catch (error) {
        console.error("Failed to fetch halls:", error);
      }
    }
    getHalls();
  }, []);

  const [selectedBlock, setSelectedBlock] = useState("All");
  const [selectedHallState, setSelectedHallState] = useState("All");
  const [filterDate, setFilterDate] = useState(null);

  // Load today's bookings on initial load
  useEffect(() => {
    handleSelection("All");
  }, []);

  async function handleSelection(hallname) {
  if (!hallname && hallname !== "All") return;
  try {
    let res;
    // If 'All' selected, fetch all bookings or all bookings for a block
    if (hallname === 'All') {
      // If block selected, fetch bookings for halls in that block
      if (selectedBlock && selectedBlock !== 'All') {
        // find halls in block
        const hallsInBlock = halls.filter(h => (h.location && h.location.split(',')[0]) === selectedBlock).map(h => h.name);
        // fetch bookings for each hall and combine
        const allBookings = [];
        for (const hn of hallsInBlock) {
          const r = await axios.get(`${BASE_URL}/user-api/hall-bookings/${encodeURIComponent(hn)}`, { withCredentials: true });
          allBookings.push(...r.data.bookings);
        }
        res = { data: { bookings: allBookings } };
      } else {
        // no block filter: get all bookings via admin/user endpoint - reuse fetching all halls then all bookings
        // fallback: fetch bookings for every hall
        const allBookings = [];
        for (const h of halls) {
          const r = await axios.get(`${BASE_URL}/user-api/hall-bookings/${encodeURIComponent(h.name)}`, { withCredentials: true });
          allBookings.push(...r.data.bookings);
        }
        res = { data: { bookings: allBookings } };
      }
    } else {
      res = await axios.get(`${BASE_URL}/user-api/hall-bookings/${encodeURIComponent(hallname)}`, { withCredentials: true });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter bookings where rejectStatus is false OR rejectStatus field does not exist
    const filteredBookings = res.data.bookings.filter(b => 
      (b.rejectStatus === false || b.rejectStatus === undefined) &&
      new Date(b.date) >= today
    );

    const sortedBookings = filteredBookings.sort((a, b) => new Date(a.date) - new Date(b.date));
    setBookings(sortedBookings);
    setSelectedHallState(hallname);
  } catch (error) {
    console.error("Failed to fetch bookings for hall:", error);
  }
}


  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const dateBookings = bookings.filter(
        (b) => new Date(b.date).toDateString() === date.toDateString()
      );
      const hasFN = dateBookings.some((b) => b.slot === "fn");
      const hasAN = dateBookings.some((b) => b.slot === "an");

      if (hasFN && hasAN) {
        return (
          <>
            <div className="semicircle fn">FN</div>
            <div className="semicircle an">AN</div>
          </>
        );
      } else if (hasFN) {
        return <div className="semicircle fn">FN</div>;
      } else if (hasAN) {
        return <div className="semicircle an">AN</div>;
      }
    }
    return null;
  };

  function goToBookHall(date) {
    // When a date is clicked in All Bookings, filter the bookings table to that date
    setFilterDate(date);
  }

  return (
    <div className="allbookings">
      <h1>All Bookings</h1>
      <div className="content">
        <div className="select-calendar">
          <div className="selecthall">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <select id="block" value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedHallState("All"); setBookings([]); setFilterDate(null); handleSelection("All"); }}>
                <option value="All">All Blocks</option>
                {blocks.map((b, i) => (
                  <option key={i} value={b}>{b}</option>
                ))}
              </select>

              <select
                id="hallname"
                onChange={(e) => { handleSelection(e.target.value); setFilterDate(null); }}
                name="hallname"
                value={selectedHallState}
              >
                <option value="All">All Halls</option>
                {halls
                  .filter(h => {
                    if (selectedBlock === 'All') return true;
                    const block = h.location && h.location.split(',')[0];
                    return block === selectedBlock;
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
              onClickDay={goToBookHall}
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
              </tr>
            </thead>
            <tbody>
              {(() => {
                const displayed = filterDate ? bookings.filter(b => new Date(b.date).toDateString() === filterDate.toDateString()) : bookings;
                if (displayed.length > 0) {
                  return displayed.map((booking, idx) => (
                    <tr key={idx} onClick={() => setSelectedRow(booking)} className="row">
                      <td>{booking.club || 'NA'}</td>
                      <td>{booking.bookingEmail}</td>
                      <td>{booking.hallname}</td>
                      <td>{booking.formattedDate || booking.date}</td>
                      <td style={{ textTransform: "uppercase" }}>{booking.slot}</td>
                    </tr>
                  ));
                }
                return (
                  <tr>
                    <td colSpan="5">No bookings available</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        {selectedRow && (
          <BookingDetails
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
          />
        )}
        {filterDate && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setFilterDate(null)} style={{ padding: '6px 10px' }}>Clear filter</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllBookings;
