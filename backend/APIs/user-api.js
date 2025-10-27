const exp = require("express");
const userApp = exp.Router();

const expressAsyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../APIs/auth-router.js");
const { ObjectId } = require("mongodb");
const { sendEmaill } = require("./emailService");
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// Helper: decide cookie options based on incoming request rather than NODE_ENV
function determineCookieOptions(req) {
  let secure = false;
  let sameSite = "lax";
  try {
    const origin = req.headers && req.headers.origin;
    const hostHeader = req.headers && req.headers.host; // includes port
    const proto = req.secure || (req.headers && req.headers["x-forwarded-proto"] === "https") ? "https" : "http";
    const requestOrigin = hostHeader ? `${proto}://${hostHeader}` : null;

    if (origin && requestOrigin) {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname;
      if (originHost === 'localhost' || originHost === '127.0.0.1') {
        // Local dev: treat as same-site across ports
        sameSite = "lax";
        secure = false;
      } else if (origin === requestOrigin) {
        sameSite = "lax";
        secure = origin.startsWith("https:") || req.secure;
      } else {
        sameSite = "none";
        secure = true;
      }
    } else {
      secure = req.secure || (req.headers && req.headers["x-forwarded-proto"] === "https");
      sameSite = secure ? "none" : "lax";
    }
  } catch (err) {
    secure = false;
    sameSite = "lax";
  }

  return { secure, sameSite };
}

userApp.get(
  "/announcement-details",
  expressAsyncHandler(async (req, res) => {
    const announcementCollections = req.app.get("announcementCollections");

    if (!announcementCollections) {
      return sendError(res, 500, "Announcement collection not set on app.");
    }

    const found = await announcementCollections.find({}).toArray();

    if (!found || found.length === 0) {
      return sendError(res, 404, "No announcements found.");
    }
    return res.status(200).json({ success: true, message: "Announcements found.", announcementData: found });
  })
);

userApp.post(
  "/user",
  expressAsyncHandler(async (req, res) => {
    let usersCollection = req.app.get("usersCollection");
    if (!usersCollection) {
      return sendError(res, 500, "Users collection not configured.");
    }

    let user = req.body;
    if (!user.email || !user.password) {
      return sendError(res, 400, "Email and password are required.");
    }

    user.email = user.email.toLowerCase();

    const existingUser = await usersCollection.findOne({ email: user.email });
    if (existingUser) {
      if (existingUser.activeStatus === false) {
        return sendError(res, 403, "Email has been blocked");
      } else if (existingUser.verifyStatus === true) {
        return sendError(res, 409, "Email has already been registered and approved");
      } else {
        return res.json({ success: true, message: "Email has already been registered. Waiting for approval..." });
      }
    }

    const hashedPassword = await bcryptjs.hash(user.password, 7);
    user.password = hashedPassword;
    user.activeStatus = true;
    user.verifyStatus = false;

    await usersCollection.insertOne(user);
    delete user.password;

    const emailHtml = `
      <p>Dear ${user.firstname || "User"},</p>
      <p>Your registration request has been successfully received.</p>
      <p>Your email: <strong>${user.email}</strong></p>
      <p>The account status is currently <em>waiting for approval</em> from the VNR Campus Halls Admin.</p>
      <p>Thank you for registering with VNR Campus Hall Bookings.</p>
      <p>You will receive an email from the admin once your account is approved.</p>
      <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
    `;

    try {
      await sendEmaill(
        user.email,
        "Registration Confirmation - Awaiting Admin Approval",
        emailHtml
      );
    } catch (emailErr) {
      console.error("Failed to send registration confirmation email:", emailErr);
    }

    res.status(201).json({ success: true, message: "Email request sent. Waiting for approval...", user });
  })
);


userApp.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const usersCollection = req.app.get("usersCollection");
    const { email, password } = req.body;
    const userEmail = email.toLowerCase();

    const user = await usersCollection.findOne({ email: userEmail });
    if (!user) return res.status(401).send({ message: "Invalid email or password" });

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) return res.status(401).send({ message: "Invalid email or password" });

    if (user.activeStatus === false) return res.status(403).send({ message: "User has been blocked" });

    if (user.verifyStatus === false) return res.status(403).send({ message: "User has not been approved" });

    const accessToken = jwt.sign({ email: userEmail }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ email: userEmail }, REFRESH_SECRET, { expiresIn: "7d" });

    await usersCollection.updateOne({ email: userEmail }, { $set: { refreshToken } });

    delete user.password;
    // Set cookies based on request origin/host/protocol
    const cookieOpts = determineCookieOptions(req);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: cookieOpts.secure,
      maxAge: 15 * 60 * 1000,
      sameSite: cookieOpts.sameSite,
      path: "/"
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: cookieOpts.secure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: cookieOpts.sameSite,
      path: "/"
    });

  const responseBody = { message: "Login successful", user };
  res.send(responseBody);
  })
);

userApp.post(
  "/refresh-token",
  expressAsyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).send({ message: "Missing refresh token" });

    const usersCollection = req.app.get("usersCollection");

    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET);
      const user = await usersCollection.findOne({ email: payload.email });

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).send({ message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "15m" });
      const cookieOpts2 = determineCookieOptions(req);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: cookieOpts2.secure,
        maxAge: 15 * 60 * 1000,
        sameSite: cookieOpts2.sameSite,
      });

  const responseBody = { message: "Access token refreshed" };
  res.send(responseBody);
    } catch (err) {
      res.status(403).send({ message: "Invalid refresh token" });
    }
  })
);

userApp.get(
  "/halls",
  expressAsyncHandler(async (req, res) => {
    const hallsCollection = req.app.get("hallsCollection");
    if (!hallsCollection) {
      return sendError(res, 500, "Halls collection not configured.");
    }

    const halls = await hallsCollection.find({ blockStatus: false }).toArray();

    res.json({ success: true, message: "Received all halls", halls });
  })
);

// Return blocks list from blocks collection
userApp.get(
  "/blocks",
  expressAsyncHandler(async (req, res) => {
    const blocksCollection = req.app.get("blocksCollection");
    if (!blocksCollection) return sendError(res, 500, "Blocks collection not configured.");
    // Try two storage shapes:
    // 1) Single document with _id: 'default_blocks' and { blocks: [...] }
    // 2) Multiple documents, each with a `name` or use _id as block identifier
    const defaultDoc = await blocksCollection.findOne({ _id: 'default_blocks' });
    if (defaultDoc && Array.isArray(defaultDoc.blocks)) {
      return res.json({ success: true, blocks: defaultDoc.blocks });
    }

    // Fallback: read all documents and map to names/_id
    const docs = await blocksCollection.find({}).toArray();
    const blocks = docs.map(d => d.name || d._id).filter(Boolean);
    // Remove duplicates and sort (optional)
    const uniqueBlocks = Array.from(new Set(blocks));
    // console.log('Fetched blocks (fallback):', uniqueBlocks);
    return res.json({ success: true, blocks: uniqueBlocks });
  })
);

userApp.get(
  "/available-halls",
  expressAsyncHandler(async (req, res) => {
    const { date, slot, block } = req.query;
    const hallsCollection = req.app.get("hallsCollection");
    const bookingsCollection = req.app.get("bookingsCollection");

    if (!hallsCollection) return sendError(res, 500, "Halls collection not configured.");
    if (!bookingsCollection) return sendError(res, 500, "Bookings collection not configured.");

    if (!date || !slot) return sendError(res, 400, "date and slot are required");

    // Find halls that are already booked for date+slot
    const booked = await bookingsCollection.find({ date, slot, rejectStatus: { $ne: true } }).toArray();
    const bookedNames = booked.map(b => b.hallname);

    // Build query for halls
    const query = { blockStatus: false };
    if (block) query.location = { $regex: `^${block}\\b`, $options: 'i' };

    const allHalls = await hallsCollection.find(query).toArray();
    const availableHalls = allHalls.filter(h => !bookedNames.includes(h.name));

    return res.json({ success: true, availableHalls, total: availableHalls.length });
  })
);

userApp.post(
  "/booking",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    try {
      const bookingsCollection = req.app.get("bookingsCollection");
      const usersCollection = req.app.get("usersCollection");

      if (!bookingsCollection) {
        return sendError(res, 500, "Bookings collection not configured.");
      }
      if (!usersCollection) {
        return sendError(res, 500, "Users collection not configured.");
      }

      const booking = req.body;
      console.log("Received booking data:", {
        ...booking,
        posterImage: booking.posterImage ? `Base64 image (${booking.posterImage.length} chars)` : "No image"
      });

      if (!booking.bookingEmail || !booking.hallname || !booking.date || !booking.slot) {
        return sendError(res, 400, "Booking Email, Hall Name, Date, and Slot are required.");
      }

    // Validate poster image if provided
    if (booking.posterImage) {
      // Check if it's a valid base64 data URL
      if (!booking.posterImage.startsWith('data:image/')) {
        return sendError(res, 400, "Invalid image format. Only image files are allowed.");
      }
      
      // Check image size (base64 encoded, so approximately 1.33x the original size)
      // Limiting to roughly 5MB base64 data (which is about 3.5MB original image)
      // This ensures we stay well under MongoDB's 16MB document limit
      const maxBase64Size = 5 * 1024 * 1024; // 5MB
      if (booking.posterImage.length > maxBase64Size) {
        return sendError(res, 400, "Image file is too large. Maximum size allowed is 3.5MB.");
      }
      
      console.log(`Poster image size: ${(booking.posterImage.length / 1024 / 1024).toFixed(2)}MB`);
    }

    const dbBooking = await bookingsCollection.findOne({
      bookingEmail: booking.bookingEmail,
      hallname: booking.hallname,
      date: booking.date,
      slot: booking.slot,
      rejectStatus: { $ne: true }
    });
    if (dbBooking) {
      return sendError(res, 409, "Booking already exists");
    }

    if (
      await bookingsCollection.findOne({
        bookingEmail: booking.bookingEmail,
        hallname: booking.hallname,
        date: booking.date,
        slot: booking.slot,
        activeStatus: false,
        verifyStatus: true,
        rejectStatus: { $ne: true }
      })
    ) {
      return sendError(res, 409, "You have already booked this slot and it's currently blocked");
    }

    if (
      await bookingsCollection.findOne({
        bookingEmail: booking.bookingEmail,
        hallname: booking.hallname,
        date: booking.date,
        slot: booking.slot,
        activeStatus: true,
        verifyStatus: false,
        rejectStatus: { $ne: true }
      })
    ) {
      return sendError(res, 409, "You have already booked this slot and it's pending...");
    }

    if (
      await bookingsCollection.findOne({
        hallname: booking.hallname,
        date: booking.date,
        slot: booking.slot,
        activeStatus: true,
        verifyStatus: true,
        rejectStatus: { $ne: true }
      })
    ) {
      return sendError(res, 409, "This slot has already been booked");
    }

    // Add formatted date and time
    const bookingDateObj = new Date(booking.date);
    booking.formattedDate = formatDate(bookingDateObj);
    booking.formattedTime = formatTime(new Date());

    // Insert booking into DB
    try {
      console.log("Attempting to insert booking into database...");
      const result = await bookingsCollection.insertOne(booking);
      console.log("Booking inserted successfully:", result.insertedId);
    } catch (dbError) {
      console.error("Database insertion error:", dbError);
      // In development return the error message to help debugging
      if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({ success: false, message: "Failed to save booking to database.", error: dbError.message, stack: dbError.stack });
      }
      return sendError(res, 500, "Failed to save booking to database.");
    }

    // Fetch user first name for email
    const dbuser = await usersCollection.findOne({ email: booking.bookingEmail });

    const emailHtml = `
      <p>Dear ${dbuser?.firstname || "User"},</p>
      <p>Your booking for the hall <strong>${booking.hallname}</strong> on <strong>${booking.formattedDate}</strong> during the <strong>${booking.slot.toUpperCase()} slot</strong> has been successfully received.</p>
      <p>Event Name: <strong>${booking.eventName || "N/A"}</strong></p>
      ${booking.posterImage ? '<p>Event poster: <em>Uploaded successfully</em></p>' : ''}
      <p>The booking status is currently <em>waiting for approval</em> from the VNR Campus Halls Admin..</p>
      <p>Thank you for using our booking system.</p>
      <p>Note : You Will Receive Email from Admin on Confirmation..!</p>
      <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
    `;

    try {
      await sendEmaill(
        booking.bookingEmail,
        "Booking Confirmation - Awaiting Admin Approval",
        emailHtml
      );
    } catch (emailErr) {
      console.error("Failed to send booking confirmation email:", emailErr);
    }

    res.status(201).json({ success: true, message: "Booking done and confirmation email sent", booking });
    } catch (error) {
      console.error("Booking endpoint error:", error);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({ success: false, message: "An error occurred while processing your booking.", error: error.message, stack: error.stack });
      }
      return sendError(res, 500, "An error occurred while processing your booking. Please try again.");
    }
  })
);
const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};
// View all active and verified bookings
userApp.get(
  "/bookings",
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    if (!bookingsCollection) {
      return sendError(res, 500, "Bookings collection not configured.");
    }

    const bookings = await bookingsCollection.find({ activeStatus: true, verifyStatus: true }).toArray();
    res.json({ success: true, message: "Received all bookings", bookings });
  })
);

// View bookings by hall
userApp.get(
  "/hall-bookings/:hallname",
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const { hallname } = req.params;

    if (!bookingsCollection) {
      return sendError(res, 500, "Bookings collection not configured.");
    }

    const bookings = await bookingsCollection.find({ hallname, activeStatus: true, verifyStatus: true }).toArray();
    res.json({ success: true, message: `Received all bookings for hall ${hallname}`, bookings });
  })
);

// View bookings by user email
userApp.get(
  "/user-bookings/:email",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const { email } = req.params;

    if (!bookingsCollection) {
      return sendError(res, 500, "Bookings collection not configured.");
    }

    const userBookings = await bookingsCollection.find({ bookingEmail: email }).toArray();
    res.json({ success: true, message: `Received all active bookings for user ${email}`, userBookings });
  })
);

// Cancel booking
userApp.put(
  "/cancel-booking/:bookingID",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const usersCollection = req.app.get("usersCollection");
    const bookingID = Number(req.params.bookingID);

    if (!bookingsCollection) {
      return sendError(res, 500, "Bookings collection not configured.");
    }

    if (!usersCollection) {
      return sendError(res, 500, "Users collection not configured.");
    }

    const dbBooking = await bookingsCollection.findOne({ bookingID });
    if (!dbBooking) {
      return sendError(res, 404, "Booking doesn't exist");
    }

    if (dbBooking.activeStatus === false) {
      return sendError(res, 400, "Booking has already been canceled");
    }

  // Read optional cancellation note from request body (if provided)
  const cancellationNote = req.body?.note || null;

  // Proceed to update booking status and store cancellation metadata
  const updatePayload = { activeStatus: false, verifyStatus: false };
  if (cancellationNote) updatePayload.cancellationNote = cancellationNote;
  updatePayload.cancelledBy = req.user?.email || 'user';
  updatePayload.cancellationDate = new Date().toISOString();

  await bookingsCollection.updateOne({ bookingID }, { $set: updatePayload });

    // Fetch user's first name for personalized email (optional)
    const dbuser = await usersCollection.findOne({ email: dbBooking.bookingEmail });

    // Compose cancellation confirmation email
    const emailHtml = `
      <p>Dear ${dbuser?.firstname || "User"},</p>
      <p>Your booking for the hall <strong>${dbBooking.hallname}</strong> on <strong>${dbBooking.formattedDate || dbBooking.date}</strong> during the <strong>${dbBooking.slot.toUpperCase()} slot</strong> has been successfully canceled.</p>
      <p>Event Name: <strong>${dbBooking.eventName || "N/A"}</strong></p>
      <p>You can make a new booking any time you wish.</p>
      <p>Thank you for using our booking system.</p>
      <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
    `;

    // Send cancellation confirmation email
    try {
      await sendEmaill(dbBooking.bookingEmail, "Booking Cancellation Confirmation", emailHtml);
    } catch (emailErr) {
      console.error("Failed to send cancellation confirmation email:", emailErr);
    }

    res.json({ success: true, message: "Booking has been canceled" });
  })
);

userApp.post(
  "/check-booking-conflict",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    try {
      const bookingsCollection = req.app.get("bookingsCollection");
      
      if (!bookingsCollection) {
        return sendError(res, 500, "Bookings collection not configured.");
      }

      const { hallname, date, slot } = req.body;

      if (!hallname || !date || !slot) {
        return sendError(res, 400, "Hall name, date, and slot are required.");
      }

      // Check if this slot is already booked by someone else
      const existingBooking = await bookingsCollection.findOne({
        hallname: hallname,
        date: date,
        slot: slot,
        activeStatus: true,
        verifyStatus: true,
        rejectStatus: { $ne: true }
      });

      if (existingBooking) {
        return res.json({ 
          conflict: true, 
          message: `This slot is already booked. The ${slot.toUpperCase()} slot for ${hallname} on ${date} is not available.`
        });
      }

      // Check if there's a pending booking for this slot
      const pendingBooking = await bookingsCollection.findOne({
        hallname: hallname,
        date: date,
        slot: slot,
        activeStatus: true,
        verifyStatus: false,
        rejectStatus: { $ne: true }
      });

      if (pendingBooking) {
        return res.json({ 
          conflict: true, 
          message: `This slot has a pending booking. The ${slot.toUpperCase()} slot for ${hallname} on ${date} is currently under review.`
        });
      }

      return res.json({ 
        conflict: false, 
        message: "Slot is available for booking."
      });

    } catch (err) {
      console.error("Error checking booking conflict:", err);
      return sendError(res, 500, "Internal server error while checking booking conflict.");
    }
  })
);


module.exports = userApp;
