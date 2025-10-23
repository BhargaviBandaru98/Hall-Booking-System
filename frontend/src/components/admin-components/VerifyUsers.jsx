import "./VerifyUsers.css";
import axios from "axios";
import { useState, useEffect, useContext } from "react";
import { userContext } from "../../contexts/UserContext";
const BASE_URL = import.meta.env.VITE_BASE_URL;

function VerifyUsers() {
  const [users, setUsers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [user] = useContext(userContext); // if needed for role checks etc.

  useEffect(() => {
    async function getUsers() {
      try {
        const res = await axios.get(`${BASE_URL}/admin-api/users`, { withCredentials: true });

        if (res.data && Array.isArray(res.data.users)) {
          const nonVerifiedUsers = res.data.users.filter(
            (u) => u.verifyStatus === false && u.activeStatus === true
          );
          setUsers(nonVerifiedUsers);
          setErrorMsg("");
        } else {
          setUsers([]);
          setErrorMsg("No users data received from server");
          console.warn("Unexpected /users response:", res);
        }
      } catch (err) {
        if (err.response) {
          setErrorMsg(`Error: ${err.response.data.message || "Failed to fetch users"}`);
          console.error("API error:", err.response.data);
        } else {
          setErrorMsg("Network or unknown error");
          console.error("Unknown error:", err);
        }
        setUsers([]);
      }
    }

    getUsers();
  }, []);

  async function verifyUser(userObj) {
    try {
      await axios.put(`${BASE_URL}/admin-api/verify-user/${userObj.email}`, {}, { withCredentials: true });
      setUsers((prevUsers) => prevUsers.filter((u) => u.email !== userObj.email));
    } catch (err) {
      console.error("Failed to verify user", err);
    }
  }

  async function rejectUser(userObj) {
    try {
      await axios.put(`${BASE_URL}/admin-api/reject-user/${userObj.email}`, {}, { withCredentials: true });
      setUsers((prevUsers) => prevUsers.filter((u) => u.email !== userObj.email));
    } catch (err) {
      console.error("Failed to reject user", err);
    }
  }

  return (
    <div className="verifyusers">
      <h1>Verify Users</h1>
      {errorMsg && <p className="error">{errorMsg}</p>}
      <div className="tablecontainer">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Firstname</th>
              <th>Lastname</th>
              <th>Club</th>
              <th>Role</th>
              <th>Verify</th>
              <th>Reject</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, idx) => (
                <tr key={idx}>
                  <td>{user.email}</td>
                  <td>{user.firstname}</td>
                  <td>{user.lastname}</td>
                  <td>{user.club}</td>
                  <td>{user.role}</td>
                  <td>
                    <div className="verify" onClick={() => verifyUser(user)}>
                      ✔
                    </div>
                  </td>
                  <td>
                    <div className="reject" onClick={() => rejectUser(user)}>X</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No Users Available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VerifyUsers;
