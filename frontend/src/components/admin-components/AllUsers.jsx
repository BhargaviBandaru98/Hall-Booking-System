import "./AllUsers.css";
import axios from "axios";
import { useState, useEffect, useContext } from "react";
import tokenContext from "../../contexts/TokenContext";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function AllUsers() {
  const [users, setUsers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

useEffect(() => {
  async function getUsers() {
    try {
      const res = await axios.get(`${BASE_URL}/admin-api/users`, { withCredentials: true });
      if (res.data && Array.isArray(res.data.users)) {
        const verifiedUsers = res.data.users.filter(
          u => u.verifyStatus === true 
        );
        setUsers(verifiedUsers);
        setErrorMsg("");
      } else {
        setUsers([]);
        setErrorMsg("No users data received from server");
      }
    } catch (err) {
      setErrorMsg("Failed to fetch users");
      setUsers([]);
    }
  }
  getUsers();
}, []);


async function blockUser(userObj) {
  try {
    await axios.put(`${BASE_URL}/admin-api/block-user/${userObj.email}`, {}, { withCredentials: true });

    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.email === userObj.email ? { ...u, activeStatus: u.activeStatus === false ? true : false } : u
      )
    );

    // Show success popup
    alert(`User ${userObj.email} has been ${userObj.activeStatus === false ? "unblocked" : "blocked"} successfully.`);
  } catch (err) {
    console.error("Failed to block/unblock user", err);
    // Show error popup
    alert("Failed to block/unblock user. Please try again.");
  }
}
  return (
    <div className="allusers">
      <h1>All Users</h1>
      {errorMsg && <p className="error">{errorMsg}</p>}
      <div className="tablecontainer">
        <table>
          <thead>
            <tr>
              <th>Club</th>
              <th>Email</th>
              <th>Role</th>
              <th>Block</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, idx) => (
                <tr key={idx} className={user.activeStatus === false ? "blockedRow" : undefined}>
                  <td>{user.club}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <div className="block" onClick={() => blockUser(user)}>
                      🚫︎
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No Users Available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AllUsers;
