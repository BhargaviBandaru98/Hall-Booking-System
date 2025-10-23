import "./AdminProfile.css";
import { Link, Outlet } from "react-router-dom";
import { useState } from "react";

function AdminProfile() {

  let [selected, setSelected] = useState("halls");

  return (
    <div className="adminprofile">
      <div className="adminheader">
        <ul>
          <Link to="halls" className={selected == "halls" ? "selected" : "notSelected"} onClick={()=>setSelected("halls")}>
            <li>Halls</li>
          </Link>
          <Link to="activebookings" className={selected == "activebookings" ? "selected" : "notSelected"} onClick={()=>setSelected("activebookings")}>
            <li>Active Bookings</li>
          </Link>
          <Link to="verifybookings" className={selected == "verifybookings" ? "selected" : "notSelected"} onClick={()=>setSelected("verifybookings")}>
            <li>Verify Bookings</li>
          </Link>
          <Link to="allusers" className={selected == "allusers" ? "selected" : "notSelected"} onClick={()=>setSelected("allusers")}>
            <li>All Users</li>
          </Link>
          <Link to="verifyusers" className={selected == "verifyusers" ? "selected" : "notSelected"} onClick={()=>setSelected("verifyusers")}>
            <li>Verify Users</li>
          </Link>
            <Link to="announcements" className={selected == "announcements" ? "selected" : "notSelected"} onClick={()=>setSelected("announcements")}>
            <li>Announcements</li>
          </Link>
        </ul>
      </div>
      <div className="content">
        <Outlet/>
      </div>
    </div>
  );
}

export default AdminProfile;