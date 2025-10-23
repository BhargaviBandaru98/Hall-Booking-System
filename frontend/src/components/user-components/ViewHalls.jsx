import "./ViewHalls.css";
import HallCard from "./HallCard";
import {useState, useEffect} from "react";
import {useNavigate, useOutletContext} from "react-router-dom";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_BASE_URL;
import defimg from "../../assets/download.jpeg";

function ViewHalls() {

  let [halls, setHalls] = useState([]);
  let [selectedCard, setSelectedCard] = useState(null);
  let { setSelected, selectedDate, setSelectedDate, selectedHall, setSelectedHall } = useOutletContext();

  let navigate = useNavigate();

  useEffect(()=>{
    async function getHalls(){
      let res = await axios.get(`${BASE_URL}/user-api/halls`);
      setHalls(res.data.halls);
    }
    getHalls();
  },[]);

  function goToBookHall(){
    setSelectedHall(selectedCard.name);
    setSelectedDate(null);
    setSelected("bookhall"); 
    navigate("/userprofile/bookhall");
  }

  return (
    <div className="viewhalls">
      <h1>View Available Halls</h1>
      <div className="cards">
        {halls.map((hall, idx)=><HallCard onClick={()=>setSelectedCard(hall)} className="card" key={idx} hall={hall}/>)}
      </div>
      {selectedCard && <div className="popup" >
        <div className="closepopup" onClick={()=>setSelectedCard(null)}></div>
        <div className="popupbackground">
          <div className="popupcard">
<img
  src={selectedCard.image && selectedCard.image.trim() !== "" ? selectedCard.image : defimg}
  alt="hall image"
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = defimg;
  }}
/>

           <h2>{selectedCard.name}</h2>
            <p><strong>Capacity:</strong> {selectedCard.capacity}</p>
            <p><strong>Location:</strong> {(() => {
              const loc = selectedCard.location || "";
              if (loc.includes(",")) {
                const [block, floor] = loc.split(",");
                return `${block ? `Block ${block}` : ''}${block && floor ? ', ' : ''}${floor ? `Floor ${floor}` : ''}`;
              }
              return loc;
            })()}</p>
            <p><strong>Description:</strong> {selectedCard.description}</p>
            <p><strong>Laptop Charging:</strong> {selectedCard.laptopCharging ? 'Yes' : 'No'}</p>
            <p><strong>Projectors / Boards:</strong> {selectedCard.projectorAvailable ? `${selectedCard.projectorCount || 0}` : 'No'}</p>
            <div className="buttons">
              <p className="book" onClick={goToBookHall}>Book</p>
              <p className="close" onClick={()=>setSelectedCard(null)}>Close</p>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

export default ViewHalls;