import "./UserProfile.css";
import { Link, Outlet } from "react-router-dom";
import { useState } from "react";

function UserProfile() {

  let [selected, setSelected] = useState("viewhalls");
  let [selectedDate, setSelectedDate] = useState(null);
  let [selectedHall, setSelectedHall] = useState("");

  return (
    <div className="userprofile">
      <div className="userheader">
        <ul>
          <Link to="viewhalls" className={selected == "viewhalls" ? "selected" : "notSelected"} onClick={()=>setSelected("viewhalls")}>
            <li>View Halls</li>
          </Link>
          <Link to="bookhall" className={selected == "bookhall" ? "selected" : "notSelected"} onClick={()=>setSelected("bookhall")}>
            <li>Book hall</li>
          </Link>
          <Link to="allbookings" className={selected == "allbookings" ? "selected" : "notSelected"} onClick={()=>setSelected("allbookings")}>
            <li>All Bookings</li>
          </Link>
          <Link to="mybookings" className={selected == "mybookings" ? "selected" : "notSelected"} onClick={()=>setSelected("mybookings")}>
            <li>My Bookings</li>
          </Link>
        </ul>
      </div>
      <div className="content">
        <Outlet context={{setSelected, selectedDate, setSelectedDate, selectedHall, setSelectedHall}}/>
      </div>
    </div>
  );
}

export default UserProfile;