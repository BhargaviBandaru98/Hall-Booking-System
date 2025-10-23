import "./BookingDetails.css"

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
              <p><strong>Date:</strong> {selectedRow.date}</p>
              <p><strong>Slot:</strong> {selectedRow.slot.toUpperCase()}</p>
              <p><strong>Event Name:</strong> {selectedRow.eventName}</p>
              <p><strong>Event Description:</strong> {selectedRow.eventDescription}</p>
              <p><strong>Date Of Booking:</strong> {selectedRow.dateOfBooking}</p>
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