import "./BookHall.css";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useState, useEffect, useContext } from "react";
import { userContext } from "../../contexts/UserContext";
import { useOutletContext } from "react-router-dom";
const BASE_URL = import.meta.env.VITE_BASE_URL;

function BookHall() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm();

  const [msg, setMsg] = useState("");
  const [user] = useContext(userContext);
  const [halls, setHalls] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [availableHalls, setAvailableHalls] = useState(null); // null = not checked yet, [] = checked and none
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [currentSelectedDate, setCurrentSelectedDate] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const { setSelected, selectedDate, setSelectedDate, selectedHall, setSelectedHall } = useOutletContext();

  // Watch the date field for changes
  const watchedDate = watch("date");

  // Get today's date in YYYY-MM-DD format for date input restrictions
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get tomorrow's date in YYYY-MM-DD
  const getTomorrowDate = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split('T')[0];
  }

  // disable today's date if current time past 15:00
  const isTodayDisabled = () => {
    const now = new Date();
    return now.getHours() >= 15; // disable today if hour >= 15 (3pm)
  };

  const getMinDate = () => isTodayDisabled() ? getTomorrowDate() : getTodayDate();

  // Check if a slot time has passed for today
  const isSlotDisabled = (slot, selectedDate) => {
    if (!selectedDate) return false;
    
    const today = getTodayDate();
    const isToday = selectedDate === today;
    
    if (!isToday) return false; // If not today, all slots are available
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // FN slot: 10:00 - 13:00 (600 - 780 minutes)
    // AN slot: 13:40 - 16:40 (820 - 1000 minutes)
    
    if (slot === 'fn') {
      // FN slot ends at 13:00 (780 minutes)
      return currentTimeInMinutes >= 780; // Disable if current time is 13:00 or later
    } else if (slot === 'an') {
      // AN slot ends at 16:40 (1000 minutes)
      return currentTimeInMinutes >= 1000; // Disable if current time is 16:40 or later
    }
    
    return false;
  };

  useEffect(() => {
    async function getHalls() {
      try {
        const res = await axios.get(`${BASE_URL}/user-api/halls`);
        setHalls(res.data.halls);
        // derive unique blocks
        const uniqueBlocks = Array.from(new Set((res.data.halls || []).map(h => h.location && h.location.split(',')[0]).filter(Boolean)));
        setBlocks(uniqueBlocks);
      } catch (error) {
        console.error("Failed to fetch halls:", error);
        setMsg("Failed to load halls.");
      }
    }
    getHalls();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setValue("date", formattedDate);
      setCurrentSelectedDate(formattedDate);
    }
    if (selectedHall) {
      setValue("hallname", selectedHall);
    }
  }, [setValue, selectedHall, selectedDate]);

  // Update currentSelectedDate when form date changes
  useEffect(() => {
    if (watchedDate) {
      setCurrentSelectedDate(watchedDate);
    }
  }, [watchedDate]);

  // Check for booking conflicts when key fields change
  useEffect(() => {
    const hallname = watch("hallname");
    const date = watch("date");
    const slot = watch("slot");

    if (hallname && date && slot) {
      checkBookingConflict(hallname, date, slot);
    } else {
      setConflictWarning("");
      setHasConflict(false);
    }
  }, [watch("hallname"), watch("date"), watch("slot")]);

  // availableHalls will be set when user clicks 'Check availability'

  const handleHallChange = (e) => {
    setSelectedHall(e.target.value);
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setCurrentSelectedDate(selectedDate);
    // Also update the form value
    setValue("date", selectedDate);
    // Reset availability when date changes
    setAvailableHalls(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Only JPEG, JPG, PNG, and WebP images are allowed.");
      setSelectedFile(null);
      return;
    }

    // Check file size (max 3.5MB to ensure base64 encoding stays under MongoDB limits)
    const maxSize = 3.5 * 1024 * 1024; // 3.5MB in bytes
    if (file.size > maxSize) {
      setFileError("File size must be less than 3.5MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Manual availability check triggered by user after selecting date, slot and block
  const handleCheckAvailability = async () => {
    setMsg("");
    setConflictWarning("");
    setHasConflict(false);

    const date = watch('date');
    const slot = watch('slot');

    if (!date || !slot || !selectedBlock) {
      setConflictWarning('Please select date, slot and block before checking availability.');
      setHasConflict(true);
      return;
    }

    try {
      const resp = await axios.get(`${BASE_URL}/user-api/available-halls`, { params: { date, slot, block: selectedBlock } });
      const avail = resp.data?.availableHalls || [];
      setAvailableHalls(avail);
      if (avail.length === 0) {
        setConflictWarning('No halls available for this date/slot/block. Please choose another date or slot.');
        setHasConflict(true);
      } else {
        setConflictWarning(`hall is available. Please proceed to book.`);
        setHasConflict(false);
      }
    } catch (err) {
      console.warn('Failed to fetch available halls', err);
      setConflictWarning('Unable to check availability. Please try again.');
      setHasConflict(true);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Additional validation for base64 result size
        const base64String = reader.result;
        const sizeInMB = (base64String.length * 0.75) / 1024 / 1024; // Rough calculation
        
        if (sizeInMB > 8) { // Allow up to 8MB base64 (about 6MB original)
          reject(new Error('Converted image is too large. Please choose a smaller image.'));
          return;
        }
        
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Check for booking conflicts
  const checkBookingConflict = async (hallname, date, slot) => {
    if (!hallname || !date || !slot) {
      setConflictWarning("");
      setHasConflict(false);
      return;
    }

    setIsCheckingConflict(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/user-api/check-booking-conflict`,
        { hallname, date, slot },
        { withCredentials: true }
      );

      if (response.data.conflict) {
        setConflictWarning(response.data.message);
        setHasConflict(true);
      } else {
        setConflictWarning("");
        setHasConflict(false);
      }
    } catch (error) {
      console.error("Error checking conflict:", error);
      if (error.response?.status === 401) {
        setConflictWarning("Please log in to check availability.");
      } else {
        setConflictWarning("Unable to check availability. Please try again.");
      }
      setHasConflict(false);
    } finally {
      setIsCheckingConflict(false);
    }
  };

  async function handleFormSubmit(bookingData) {
    setMsg("");

    if (!user || !user.email) {
      setMsg("User information missing. Please log in.");
      return;
    }

    // Check for booking conflicts before proceeding
    if (hasConflict) {
      setMsg("Cannot proceed with booking due to conflict. Please select a different date/slot/hall.");
      return;
    }

    // Double-check conflict before final submission
    await checkBookingConflict(bookingData.hallname, bookingData.date, bookingData.slot);
    if (hasConflict) {
      setMsg("This slot has just been booked by someone else. Please select a different option.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(maxBookingDate.getDate() + 30);

    if (new Date(bookingData.date) < today) {
      setMsg("Booking dates in the past are not allowed.");
      return;
    }

    if (new Date(bookingData.date) > maxBookingDate) {
      setMsg("Booking dates are only allowed within 30 days from today.");
      return;
    }

    // Check if the selected slot time has passed for today
    if (isSlotDisabled(bookingData.slot, bookingData.date)) {
      const slotName = bookingData.slot === 'fn' ? 'FN (10:00 - 1:00)' : 'AN (1:40 - 4:40)';
      setMsg(`The ${slotName} slot for today has already passed. Please select a future date or available slot.`);
      return;
    }

    try {
      // Convert image to base64 if selected
      let posterImage = null;
      if (selectedFile) {
        try {
          posterImage = await convertToBase64(selectedFile);
          console.log(`Image converted to base64, size: ${(posterImage.length / 1024 / 1024).toFixed(2)}MB`);
        } catch (imageError) {
          setMsg(`Image processing failed: ${imageError.message}`);
          return;
        }
      }

      bookingData.bookingEmail = user.email;
      bookingData.bookingID = Date.now();
      bookingData.dateOfBooking = new Date().toISOString();
      bookingData.verifyStatus = false;
      bookingData.activeStatus = true;
      if (posterImage) {
        bookingData.posterImage = posterImage;
      }

      console.log("Submitting booking data:", {
        ...bookingData,
        posterImage: posterImage ? "Image data present" : "No image"
      });

      const res = await axios.post(`${BASE_URL}/user-api/booking`, bookingData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      alert(res.data.message || "Booking successful!");
      setMsg(res.data.message);
      reset(); 
      setSelectedFile(null);
      setFileError("");
      setSelected(null);
      setSelectedDate(null);
      setSelectedHall(null);
    } catch (err) {
      console.error("Booking submission error:", err);
      console.error("Error response:", err.response?.data);
      setMsg(err.response?.data?.message || "Booking failed. Please try again.");
    }
  }

  return (
    <div className="bookhall">
      <h1>Book Hall</h1>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="content content1">
          <label htmlFor="date">Select date:</label>
          <input 
            type="date" 
            id="date" 
            min={getMinDate()}
            {...register("date", { required: true })} 
            onChange={handleDateChange}
          />
          {errors.date && <p>*Date is required</p>}

          <label htmlFor="slot">Slot:</label>
          <div className="slot">
            <div className="radio1 radio">
              <input 
                type="radio" 
                id="fn" 
                value="fn" 
                {...register("slot", { required: true })} 
                disabled={isSlotDisabled('fn', currentSelectedDate)}
              />
              <label htmlFor="fn" className={isSlotDisabled('fn', currentSelectedDate) ? 'disabled' : ''}>
                FN (10:00 - 1:00)
                {isSlotDisabled('fn', currentSelectedDate) && <span className="slot-disabled-text"> (Time passed)</span>}
              </label>
            </div>
            <div className="radio2 radio">
              <input 
                type="radio" 
                id="an" 
                value="an" 
                {...register("slot", { required: true })} 
                disabled={isSlotDisabled('an', currentSelectedDate)}
              />
              <label htmlFor="an" className={isSlotDisabled('an', currentSelectedDate) ? 'disabled' : ''}>
                AN (1:40 - 4:40)
                {isSlotDisabled('an', currentSelectedDate) && <span className="slot-disabled-text"> (Time passed)</span>}
              </label>
            </div>
          </div>
          {errors.slot && <p>*Slot is required</p>}

          <label htmlFor="block">Select block:</label>
          <select id="block" value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedHall(null); setAvailableHalls(null); }}>
            <option value="">--Select block--</option>
            {blocks.map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>

          <label htmlFor="hallname">Select hall:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select id="hallname" {...register("hallname", { required: true })} value={selectedHall || ""} onChange={handleHallChange} disabled={!selectedBlock || (availableHalls !== null && availableHalls.length === 0)}>
              <option value="" disabled>--Select hall--</option>
              {halls
                .filter(h => {
                  if (!selectedBlock) return false;
                  const block = h.location && h.location.split(',')[0];
                  if (block !== selectedBlock) return false;
                  if (availableHalls === null) return true; // availability not checked -> show all halls in block
                  // availability checked -> show only available halls
                  return availableHalls.some(a => a.name === h.name);
                })
                .map((hall, idx) => (
                  <option key={idx} value={hall.name}>{hall.name}</option>
                ))}
            </select>
            <button type="button" onClick={handleCheckAvailability} style={{ padding: '8px 10px' }}>Check availability</button>
          </div>
          {!selectedBlock && <p style={{color:'#f05', marginTop:'6px'}}>Please select a block to view halls.</p>}
          {errors.hallname && <p>*Hall is required</p>}
        </div>
        <div className="content content2">
          <label htmlFor="eventName">Event Name:</label>
          <input type="text" id="eventName" placeholder="Enter event name" {...register("eventName", { required: true })} />
          {errors.eventName && <p>*Event name is required</p>}
          <label htmlFor="eventDescription">Event Description:</label>
          <textarea id="eventDescription" placeholder="Enter event details" {...register("eventDescription", { required: true })} />
          {errors.eventDescription && <p>*Event description is required</p>}
          
          <label htmlFor="posterImage">Event Poster (Optional):</label>
          <div className="file-upload-container">
            <input 
              type="file" 
              id="posterImage" 
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
            />
            <div className="file-upload-info">
              <small>Supported formats: JPEG, JPG, PNG, WebP (Max size: 3.5MB)</small>
            </div>
          </div>
          {fileError && <p className="file-error">{fileError}</p>}
          {selectedFile && <p className="file-success">Selected: {selectedFile.name}</p>}
          
          {isCheckingConflict && (
            <p style={{ color: "blue", marginTop: "10px" }}>Checking availability...</p>
          )}
          
          {conflictWarning && (
            <p style={{ color: hasConflict ? "red" : "green", marginTop: "10px", fontWeight: "bold" }}>
              {conflictWarning}
            </p>
          )}
          
          <p style={{ marginTop: "10px" }}>{msg}</p>
          <button type="submit" disabled={hasConflict || isCheckingConflict}>
            {hasConflict ? "Slot Not Available" : isCheckingConflict ? "Checking..." : "Make Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BookHall;
