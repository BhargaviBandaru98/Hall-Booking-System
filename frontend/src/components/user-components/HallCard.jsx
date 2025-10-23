import "./HallCard.css";
import img from "../../assets/auditorium.jpg";

function HallCard(props) {
  let str = props.hall.name + " | " + props.hall.location + " | " + props.hall.capacity;

  return (
    <div className="hallcard" onClick={props.onClick}>
      <div className="details">
        <img
          src={props.hall.image && props.hall.image.trim() !== "" ? props.hall.image : img}
          alt="hall image"
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop if fallback image also fails
            e.target.src = img; // Fallback to default image
          }}
        />
        <div className="details1">
          <p>{str.length > 27 ? `${str.substring(0, 27)}...` : `${str.substring(0, 30)}`}</p>
        </div>
        <div className="details2">
          <p>{props.hall.description.substring(0, 70)}...</p>
        </div>
        <p className="viewmore">View More</p>
      </div>
    </div>
  );
}

export default HallCard;
