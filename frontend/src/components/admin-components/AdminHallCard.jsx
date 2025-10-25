import "./AdminHallCard.css";
import img from "../../assets/auditorium.jpg";
import { useState, useContext } from "react";
import tokenContext from "../../contexts/TokenContext";
import axios from "axios";
import defaultImg from '../../assets/download.jpeg';
const BASE_URL = import.meta.env.VITE_BASE_URL;

function AdminHallCard(props) {
  let [blockStatus, setBlockStatus] = useState(props.hall.blockStatus);
  let [token] = useContext(tokenContext);
  let [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const canEdit = props.canEdit !== false; // Default to true if not provided (for backward compatibility)

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
      setShowBlockConfirm(false);
    } catch (err) {
      console.log(err);
      // Reset status on error
      setBlockStatus(!blockStatus);
      setShowBlockConfirm(false);
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

      <div className="cardActions">
        <button 
          className="editBtn" 
          onClick={(e) => { e.stopPropagation(); if (props.onEdit && canEdit) props.onEdit(); }}
          disabled={!canEdit}
          title={!canEdit ? "You don't have permission to edit this hall" : "Edit this hall"}
        >
          Edit
        </button>
        <button 
          className="blockToggle" 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (canEdit) setShowBlockConfirm(true);
          }}
          disabled={!canEdit}
          title={!canEdit ? "You don't have permission to block/unblock this hall" : "Block/Unblock this hall"}
        >
          {blockStatus === false ? 'Block' : 'Unblock'}
        </button>
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

      {/* Block confirmation modal */}
      {showBlockConfirm && (
        <div className="blockConfirmModal">
          <div className="modalBackdrop" onClick={() => setShowBlockConfirm(false)} />
          <div className="modalContent">
            <h3>{blockStatus === false ? "Block Hall?" : "Unblock Hall?"}</h3>
            <p>
              {blockStatus === false 
                ? `Are you sure you want to block "${props.hall.name}"? Users will not be able to book this hall.`
                : `Are you sure you want to unblock "${props.hall.name}"? Users will be able to book this hall.`
              }
            </p>
            <div className="modalButtons">
              <button 
                className="confirmBtn" 
                onClick={() => toggleblock()}
              >
                {blockStatus === false ? 'Block' : 'Unblock'}
              </button>
              <button 
                className="cancelBtn" 
                onClick={() => setShowBlockConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHallCard;
