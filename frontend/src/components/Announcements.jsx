import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import announcementIcon from '../assets/announcement.png';
import './Announcements.css';

const SlideWrapper = ({ announcement, id }) => {
  const nodeRef = useRef(null);
  return (
    <CSSTransition nodeRef={nodeRef} key={id} timeout={1000} classNames="slide">
      <div ref={nodeRef} className="details">
        <div className="announcement-header">
          <img src={announcementIcon} alt="Announcement Icon" className="announcement-icon" />
          <h2 className="announcement-heading">Announcements</h2>
          <p className="announcement-title">
            <strong>{announcement.title}</strong> : <i className="announcement-message">{announcement.message}</i>
          </p>
        </div>
        <div className="date-overlay">
          {announcement.createdAt ? `${announcement.createdAt.date} ${announcement.createdAt.time}` : "No Date Info"}
        </div>
      </div>
    </CSSTransition>
  );
};

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  useEffect(() => {
    const ws = new WebSocket("wss://vnr-campus-hall-bookings.onrender.com/ws");
    ws.onopen = () => console.log("WebSocket connected for announcements");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) { console.error("Server error:", data.error); return; }
        if (data.type === "announcement") { setAnnouncements(data.announcements); }
      } catch (err) { console.error("Error parsing WebSocket message:", err); }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket connection closed for announcements");
    return () => ws.close();
  }, []);

  const validAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      if (!a.createdAt) return false;
      const [day, month, year] = a.createdAt.date.split('/');
      const createdDateTime = new Date(`${year}-${month}-${day}T${a.createdAt.time}`);
      const validUntil = new Date(createdDateTime.getTime() + a.validity * 60 * 60 * 1000);
      return Date.now() < validUntil;
    });
  }, [announcements]);

  useEffect(() => {
    if (validAnnouncements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncement(prev => (prev + 1) % validAnnouncements.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [validAnnouncements]);

  const currentSlide = validAnnouncements[currentAnnouncement] || {};

  return (
    <div className="announcement-container">
      {validAnnouncements.length > 0 ? (
        validAnnouncements.length > 1 ? (
          <TransitionGroup>
            <SlideWrapper announcement={currentSlide} id={`${currentAnnouncement}-${currentSlide.title}`} />
          </TransitionGroup>
        ) : (
          <div className="details">
            <div className="announcement-header">
              <img src={announcementIcon} alt="Announcement Icon" className="announcement-icon" />
              <h2 className="announcement-heading">Announcements</h2>
              <p className="announcement-title"><strong>{currentSlide.title}</strong>: <i className="announcement-message">{currentSlide.message}</i></p>
            </div>
            <div className="date-overlay">
              {currentSlide.createdAt ? `${currentSlide.createdAt.date} ${currentSlide.createdAt.time}` : "No Date Info"}
            </div>
          </div>
        )
      ) : (
        <p id="no-announce"><i>No announcements for Today..</i></p>
      )}
    </div>
  );
}

export default Announcements;
