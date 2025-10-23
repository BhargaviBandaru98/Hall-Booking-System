import "./AdminHallCard.css";
import img from "../../assets/auditorium.jpg";
import { useState, useContext } from "react";
import tokenContext from "../../contexts/tokenContext";
import axios from "axios";
import defaultImg from '../../assets/download.jpeg';
const BASE_URL = import.meta.env.VITE_BASE_URL;

function AdminHallCard(props) {
  let [blockStatus, setBlockStatus] = useState(props.hall.blockStatus);
  let [token] = useContext(tokenContext);

  async function toggleblock() {
    try {
      let config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      if (blockStatus === false) {
        setBlockStatus(true);
      } else {
        setBlockStatus(false);
      }
      let res = await axios.put(
        `${BASE_URL}/admin-api/block-hall/${props.hall.name}`,
        {},
        config
      );
    } catch (err) {
      console.log(err);
    }
  }

  let str = `${props.hall.name} | ${props.hall.location} | ${props.hall.capacity}`;

  return (
    <div className="adminhallcard">
<div
  className={blockStatus === false ? "details" : "details blocked"}
  onClick={props.onClick}
>

<img src={props.hall.image && props.hall.image.trim() !== "" ? props.hall.image : defaultImg} alt="hall"/>
        <div className="details1">
          <p>{str.length > 27 ? `${str.substring(0, 27)}...` : str}</p>
        </div>
        <div className="details2">
          <p>{props.hall.description.substring(0, 68)}...</p>
        </div>
        <p className="viewmore">View More</p>
      </div>

      {/* Status indicator instead of toggle */}
      <div className="statusIndicator">
        <div
          className={blockStatus === false ? "circleActive" : "circleInactive"}
        />
        <span className={blockStatus === false ? "activeText" : "inactiveText"}>
          {blockStatus === false ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

export default AdminHallCard;
