import "./BookingDetails.css"

const slotLabel = (slot) => {
  if (!slot) return "N/A";
  if (slot.toLowerCase() === 'fn') return 'FN (10:00 - 13:00)';
  if (slot.toLowerCase() === 'an') return 'AN (13:40 - 16:40)';
  return slot.toUpperCase();
}

const formatEventDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'N/A';
  const d = new Date(dateTimeStr);
  if (isNaN(d)) return dateTimeStr;
  return d.toLocaleString();
}

function BookingDetails({selectedRow, setSelectedRow}) {
  return (
    <div className='bookingdetails'>
        <div className="popup" >
        <div className="closepopup" onClick={()=>setSelectedRow(null)}></div>
        <div className="popupbackground">
          <div className="popupcard">
            <div className="details">
              <h1>Booking Details</h1>
              <p><strong>Booking Email:</strong> {selectedRow.bookingEmail}</p>
              <p><strong>Hallname:</strong> {selectedRow.hallname}</p>
              <p><strong>Date:</strong> {formatEventDate(selectedRow.date || selectedRow.formattedDate)}</p>
              <p><strong>Slot:</strong> {slotLabel(selectedRow.slot)}</p>
              <p><strong>Event Name:</strong> {selectedRow.eventName}</p>
              <p><strong>Event Description:</strong> {selectedRow.eventDescription}</p>
              <p><strong>Date Of Booking:</strong> {formatDateTime(selectedRow.dateOfBooking)}</p>
              <p><strong>Event Poster:</strong> {selectedRow.image != "" ? <img src={selectedRow.image} alt="Event Poster" /> : "No Event Poster"}</p> 
            </div>
            <div className="buttons">
              <p className="close" onClick={()=>setSelectedRow(null)}>Close</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingDetails;