const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const expressAsyncHandler = require("express-async-handler");
const adminApp = require("express").Router();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const { ObjectId } = require("mongodb");
let { verifyToken } = require("../APIs/auth-router.js");
const { sendEmaill } = require("./emailService");
adminApp.post("/login", expressAsyncHandler(async (req, res) => {
  const adminCollection = req.app.get("adminCollection");
  const { email, password } = req.body;
  const userEmail = email.toLowerCase();

  const user = await adminCollection.findOne({ email: userEmail });
  if (!user) return res.status(401).send({ message: "Invalid email or password" });

  const isValid = await bcryptjs.compare(password, user.password);
  if (!isValid) return res.status(401).send({ message: "Invalid email or password" });

  const accessToken = jwt.sign({ email: userEmail }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ email: userEmail }, REFRESH_SECRET, { expiresIn: "7d" });

  await adminCollection.updateOne({ email: userEmail }, { $set: { refreshToken } });

  delete user.password;

  // Configure cookies: secure only in production, sameSite none in production to allow cross-site cookies
  const cookieSecure = process.env.NODE_ENV === "production";
  const cookieSameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: cookieSecure,
    maxAge: 15 * 60 * 1000,
    sameSite: cookieSameSite,
    path: "/"
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: cookieSameSite,
    path: "/"
  });

  const responseBody = { message: "Login successful", user };
  if (process.env.NODE_ENV !== "production") responseBody.token = accessToken;
  res.send(responseBody);
}));

// Endpoint for creating admin accounts (used by frontend registration)
adminApp.post(
  "/create-admin",
  expressAsyncHandler(async (req, res) => {
    try {
      const adminCollection = req.app.get("adminCollection");
      if (!adminCollection) return res.status(500).send({ message: "Admin collection not configured." });

      const { name, email, phone, altPhone, manages, password } = req.body;
      if (!name || !email || !phone || !password) {
        return res.status(400).send({ message: "name, email, phone and password are required" });
      }

      const emailLower = (email || "").toLowerCase();
      const existing = await adminCollection.findOne({ email: emailLower });
      if (existing) return res.status(409).send({ message: "Admin with this email already exists" });

      const hashed = await bcryptjs.hash(password, 7);
      const adminDoc = {
        name,
        email: emailLower,
        phone,
        altPhone: altPhone || null,
        manages: Array.isArray(manages) ? manages : (manages ? [manages] : []),
        password: hashed,
        userType: "admin",
        createdAt: new Date().toISOString()
      };

      await adminCollection.insertOne(adminDoc);

      return res.status(201).send({ message: "Admin registered successfully" });
    } catch (err) {
      console.error("Error creating admin:", err);
      return res.status(500).send({ message: "Server error while creating admin" });
    }
  })
);
adminApp.post("/refresh-token", expressAsyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).send({ message: "Missing refresh token" });

  const adminCollection = req.app.get("adminCollection");
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await adminCollection.findOne({ email: payload.email });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).send({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "15m" });
    const cookieSecure2 = process.env.NODE_ENV === "production";
    const cookieSameSite2 = cookieSecure2 ? "none" : "lax";
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: cookieSecure2,
      maxAge: 15 * 60 * 1000,
      sameSite: cookieSameSite2,
    });

    const responseBody = { message: "Access token refreshed" };
    if (process.env.NODE_ENV !== "production") responseBody.token = newAccessToken;
    res.send(responseBody);
  } catch (err) {
    res.status(403).send({ message: "Invalid refresh token" });
  }
}));

adminApp.post(
  "/create-announcement",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    try {
      const { title, message, validity, notifyMail } = req.body;
      const validityHours = Number(validity);
      const notify = notifyMail === "true" || notifyMail === true;

      if (!title || !message || !validity) {
        return res.status(400).json({ message: "Title, message, and validity are required." });
      }
      if (isNaN(validityHours) || validityHours <= 0) {
        return res.status(400).json({ message: "Validity must be a positive number." });
      }

      const announcement = {
        title,
        message,
        validity: validityHours,
        createdAt: {
          date: formatDate(new Date()),
          time: formatTime(new Date()),
        },
      };

      const announcementCollections = req.app.get("announcementCollections");
      if (!announcementCollections) {
        return res.status(500).json({ message: "Announcement collection not set on app." });
      }

      await announcementCollections.insertOne(announcement);

      if (notify) {
        const userCollections = req.app.get("usersCollection");
        if (userCollections) {
          const users = await userCollections.find({ activeStatus: true,verifyStatus:true }).toArray();
          const emails = users.map((user) => user.email).filter(Boolean);

          const announceSubject = `Announcement from VNR Hall Bookings : ${title}`;
          const announceHtml = `
<div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd; 
border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); font-family:Arial, sans-serif; color:#333; line-height:1.6;">
  <h3 style="color:#007bff; margin-top:0;">Greetings from <strong>Hall Bookings, VNR VJIET</strong>!</h3>
  <p>We are excited to announce a new update on our platform:</p>
  <p><strong>Title:</strong> ${title}</p>
  <p><strong>Message:</strong> ${message}</p>
  <p>Don't miss out on this announcement – check it out on VNR Hall Bookings Website!</p>
  <p>Regards,<br><strong>Hall Bookings, VNR VJIET</strong></p>
</div>`;

          const emailPromises = emails.map((email) =>
            sendEmaill(email, announceSubject, announceHtml)
          );
          await Promise.all(emailPromises);
        }
      }

      return res.status(201).json({ message: "Announcement created successfully!" });
    } catch (error) {
      console.error("Error creating announcement:", error);
      return res.status(500).json({ message: "Server error while creating announcement", error: error.message });
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
adminApp.get("/halls", expressAsyncHandler(async (req, res) => {
  const hallsCollection = req.app.get("hallsCollection");
  const halls = await hallsCollection.find().toArray();
  res.send({ message: "received all halls", halls, allHalls: halls });
}));

adminApp.get("/admin-info", verifyToken, expressAsyncHandler(async (req, res) => {
  const adminCollection = req.app.get("adminCollection");
  const adminEmail = req.user?.email;

  if (!adminEmail) {
    return res.status(401).send({ message: "Admin not authenticated" });
  }

  const admin = await adminCollection.findOne({ email: adminEmail });
  if (!admin) {
    return res.status(404).send({ message: "Admin not found" });
  }

  res.send({ 
    message: "Admin information retrieved", 
    admin: {
      name: admin.name,
      email: admin.email,
      manages: admin.manages || [],
      userType: admin.userType,
      phone: admin.phone,
      altPhone: admin.altPhone
    }
  });
}));

adminApp.put(
  "/update-admin",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const adminCollection = req.app.get("adminCollection");
    const adminEmail = req.user?.email;

    if (!adminEmail) {
      return res.status(401).send({ message: "Admin not authenticated" });
    }

    const { name, phone, altPhone } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).send({ message: "Name is required" });
    }

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).send({ message: "Phone number must be 10 digits" });
    }

    if (altPhone && !/^[0-9]{10}$/.test(altPhone)) {
      return res.status(400).send({ message: "Alternate phone number must be 10 digits" });
    }

    const updateData = {
      name,
      phone: phone || null,
      altPhone: altPhone || null
    };

    const result = await adminCollection.findOneAndUpdate(
      { email: adminEmail },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).send({ message: "Admin not found" });
    }

    const updatedAdmin = result.value;

    res.send({
      message: "Admin profile updated successfully",
      admin: {
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        manages: updatedAdmin.manages || [],
        userType: updatedAdmin.userType,
        phone: updatedAdmin.phone,
        altPhone: updatedAdmin.altPhone
      }
    });
  })
);

adminApp.post(
  "/hall",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const hallsCollection = req.app.get("hallsCollection");
    const usersCollection = req.app.get("usersCollection");
    const adminCollection = req.app.get("adminCollection");
    const hall = req.body;

    if (!hallsCollection) {
      return res.status(500).send({ message: "Halls collection not configured." });
    }
    if (!usersCollection) {
      return res.status(500).send({ message: "Users collection not configured." });
    }

    // Verify block is provided
    if (!hall.block) {
      return res.status(400).send({ message: "Block is required when adding a hall" });
    }

    const existing = await hallsCollection.findOne({ name: hall.name });
    if (existing) {
      return res.status(400).send({ message: "Hall already exists" });
    }

    // Verify that the authenticated admin manages this block
    const adminEmail = req.user?.email || req.body.adminEmail;
    if (adminEmail) {
      const admin = await adminCollection.findOne({ email: adminEmail });
      if (admin && admin.manages && !admin.manages.includes(hall.block)) {
        return res.status(403).send({ message: "You can only add halls to blocks you manage" });
      }
    }

    await hallsCollection.insertOne(hall);

    const usersCursor = usersCollection.find({ verifyStatus: true, activeStatus: true });
    const users = await usersCursor.toArray();

    const subject = "New Hall Added - VNR Campus Hall Bookings";
    const htmlContent = `
      <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd; 
        border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
        <h2 style="color:#28a745;">New Hall Added</h2>
        <p>Dear User,</p>
        <p>We are excited to inform you that a new hall named <strong>${hall.name}</strong> has been added to the VNR Campus Hall Bookings system.</p>
        <p>Feel free to book this hall for your upcoming events.</p>
        <p>Regards,<br/><strong>VNR Campus Hall Bookings Team</strong></p>
      </div>
    `;

    const sendEmailPromises = users.map(user => {
      if (user.email) {
        return sendEmaill(user.email, subject, htmlContent).catch(err => {
          console.error(`Failed to send hall notification to ${user.email}:`, err);
        });
      }
    });

    try {
      await Promise.all(sendEmailPromises);
    } catch (emailErr) {
      console.error("Error sending notifications for new hall:", emailErr);
    }

    res.send({ message: "New hall added and users notified", hall });
  })
);


adminApp.put("/hall/:name", verifyToken, expressAsyncHandler(async (req, res) => {
  const hallsCollection = req.app.get("hallsCollection");
  const adminCollection = req.app.get("adminCollection");
  const hallName = req.params.name;
  const hallData = { ...req.body };

  if (hallData._id) {
    delete hallData._id;
  }

  const existing = await hallsCollection.findOne({ name: hallName });
  if (!existing) {
    return res.status(404).send({ message: "Hall doesn't exist" });
  }

  // Verify that the authenticated admin manages this hall's block
  const adminEmail = req.user?.email;
  if (adminEmail) {
    const admin = await adminCollection.findOne({ email: adminEmail });
    if (admin && admin.manages && !admin.manages.includes(existing.block)) {
      return res.status(403).send({ message: "You can only edit halls in blocks you manage" });
    }
  }

  await hallsCollection.updateOne({ name: hallName }, { $set: hallData });

  const updatedHall = await hallsCollection.findOne({ name: hallName });
  res.send({ message: "Hall details updated", hall: updatedHall });
}));

adminApp.delete("/delete-announcement/:id", async (req, res) => {
  try {
    const announcementCollections = req.app.get("announcementCollections");
    if (!announcementCollections) {
      return res.status(500).json({ message: "Announcement collection not set on app.", success: false });
    }

    const { id } = req.params;

    const announcement = await announcementCollections.findOne({ _id: new ObjectId(id) });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found", success: false });
    }

    const result = await announcementCollections.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      return res.status(200).json({ message: "Announcement deleted successfully", success: true });
    } else {
      return res.status(404).json({ message: "Announcement not found", success: false });
    }
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return res.status(500).json({ message: "Server error while deleting announcement", error: error.message, success: false });
  }
});


adminApp.put("/block-hall/:name", verifyToken, expressAsyncHandler(async (req, res) => {
  const hallsCollection = req.app.get("hallsCollection");
  const adminCollection = req.app.get("adminCollection");
  const hallName = req.params.name;

  const hall = await hallsCollection.findOne({ name: hallName });
  if (!hall) {
    return res.status(404).send({ message: "Hall does not exist" });
  }

  // Verify that the authenticated admin manages this hall's block
  const adminEmail = req.user?.email;
  if (adminEmail) {
    const admin = await adminCollection.findOne({ email: adminEmail });
    if (admin && admin.manages && !admin.manages.includes(hall.block)) {
      return res.status(403).send({ message: "You can only block/unblock halls in blocks you manage" });
    }
  }

  const newBlockStatus = !hall.blockStatus;
  await hallsCollection.updateOne({ name: hallName }, { $set: { blockStatus: newBlockStatus } });

  res.status(200).send({
    message: `Hall has been ${newBlockStatus ? "blocked" : "unblocked"}`,
    blockStatus: newBlockStatus,
  });
}));




adminApp.delete("/hall/:name", verifyToken, expressAsyncHandler(async (req, res) => {
    const hallsCollection = req.app.get("hallsCollection");
    const adminCollection = req.app.get("adminCollection");
    const name = req.params.name;
    const dbhall = await hallsCollection.findOne({ name });
    if (!dbhall) {
        return res.send({ message: "Hall doesn't exist" });
    }

    // Verify that the authenticated admin manages this hall's block
    const adminEmail = req.user?.email;
    if (adminEmail) {
      const admin = await adminCollection.findOne({ email: adminEmail });
      if (admin && admin.manages && !admin.manages.includes(dbhall.block)) {
        return res.status(403).send({ message: "You can only delete halls in blocks you manage" });
      }
    }

    await hallsCollection.deleteOne({ name });
    res.send({ message: "Hall has been deleted" });
}));

adminApp.get(
  "/users",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const usersCollection = req.app.get("usersCollection");
    const users = await usersCollection.find().toArray();

    users.forEach((user) => delete user.password);

    res.status(200).send({
      message: "received all users",
      users,
    });
  })
);

adminApp.put(
  "/verify-user/:email",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    let usersCollection = req.app.get("usersCollection");
    let email = req.params.email;

    let dbuser = await usersCollection.findOne({ email: email });
    if (dbuser == null) {
      return res.send({ message: "User doesn't exist" });
    }

    if (dbuser.activeStatus == false) {
      return res.send({ message: "User has been blocked and can't be verified" });
    }

    if (dbuser.verifyStatus == false) {
      await usersCollection.updateOne({ email: email }, { $set: { verifyStatus: true } });

      const subject = "Account Confirmation Message";
      const htmlContent = `
        <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;
          border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
          <h2 style="color:#007bff;">Congratulations!</h2>
          <p>Dear ${dbuser.firstname || "User"},</p>
          <p>Your account has been successfully <strong>approved and verified</strong> by the VNR Campus Halls Admin team.</p>
          <p>You now have full access to the hall booking platform.</p>
          <p>If you have any questions, feel free to contact support.</p>
          <br/>
          <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
        </div>
      `;

      try {
        await sendEmaill(email, subject, htmlContent);
      } catch (error) {
        console.error("Error sending verification email:", error);
      }

      res.send({ message: "User has been verified and notified by email" });
    } else {
      res.send({ message: "User has already been verified" });
    }
  })
);

adminApp.put(
  "/block-user/:email",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const usersCollection = req.app.get("usersCollection");
    const email = req.params.email;
    const dbuser = await usersCollection.findOne({ email: email });

    if (!dbuser) {
      return res.send({ message: "User doesn't exist" });
    }

    let mailSubject = "";
    let mailHtml = "";

    if (dbuser.activeStatus === false) {
      await usersCollection.updateOne({ email: email }, { $set: { activeStatus: true } });
      mailSubject = "Account Status: Unblocked by VNR Campus Halls Admin";
      mailHtml = `
        <div style="max-width:600px; margin:auto; background:#fff; padding:20px; 
          border:1px solid #ddd; border-radius:8px; font-family:Arial, sans-serif; color:#333;">
          <h2 style="color:#5cb85c;">Account Unblocked</h2>
          <p>Dear ${dbuser.firstname || "User"},</p>
          <p>Your account has been <strong>unblocked</strong> and restored by the VNR Campus Halls Admin team.</p>
          <p>You now have full access to our portal again.</p>
          <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
        </div>`;

      try {
        await sendEmaill(email, mailSubject, mailHtml);
      } catch (err) {
        console.error("Error sending unblock email:", err);
      }

      return res.send({ message: "User has been unblocked and notified" });
    } else {
      await usersCollection.updateOne({ email: email }, { $set: { activeStatus: false } });
      mailSubject = "Account Status: Blocked by VNR Campus Halls Admin";
      mailHtml = `
        <div style="max-width:600px; margin:auto; background:#fff; padding:20px; 
          border:1px solid #ddd; border-radius:8px; font-family:Arial, sans-serif; color:#333;">
          <h2 style="color:#d9534f;">Account Blocked</h2>
          <p>Dear ${dbuser.firstname || "User"},</p>
          <p>Your account has been <strong>blocked</strong> by the VNR Campus Halls Admin team and access has been disabled.</p>
          <p>If you have questions, please contact support.</p>
          <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
        </div>`;

      try {
        await sendEmaill(email, mailSubject, mailHtml);
      } catch (err) {
        console.error("Error sending block email:", err);
      }

      return res.send({ message: "User has been blocked and notified" });
    }
  })
);

adminApp.get("/bookings", expressAsyncHandler(async(req, res)=>{
    let bookingsCollection = req.app.get("bookingsCollection");
    let bookings = await bookingsCollection.find().toArray();
    res.send({message: "received all bookings", bookings: bookings});
}));

adminApp.get("/hall-bookings/:hallname", expressAsyncHandler(async(req, res)=>{
    let bookingsCollection = req.app.get("bookingsCollection");
    let hallname = req.params.hallname;
    let bookings = await bookingsCollection.find({hallname: hallname, verifyStatus: true}).toArray();
    res.send({message: "received all bookings", bookings: bookings});
}));

adminApp.put(
  "/verify-booking/:bookingID",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const bookingID = Number(req.params.bookingID);
    const { note } = req.body;
    const dbBooking = await bookingsCollection.findOne({ bookingID });

    if (!dbBooking) {
      return res.status(404).send({ message: "Booking doesn't exist" });
    }

    if (dbBooking.activeStatus === false) {
      return res.status(400).send({ message: "Booking has been deactivated" });
    }

    if (dbBooking.verifyStatus === false) {
      const updateData = { verifyStatus: true };
      if (note) {
        updateData.acceptanceNote = note;
        updateData.acceptanceNoteDate = new Date().toISOString();
      }
      
      await bookingsCollection.updateOne({ bookingID }, { $set: updateData });

      const usersCollection = req.app.get("usersCollection");
      if (usersCollection) {
        const user = await usersCollection.findOne({ email: dbBooking.bookingEmail });
        if (user && user.email) {
          const subject = "Booking Confirmation - VNR Hall Booking";
          const htmlContent = `
            <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;
              border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
              <h2 style="color:#28a745;">Booking Confirmed</h2>
              <p>Dear ${user.firstname || "User"},</p>
              <p>Your booking has been successfully verified and confirmed by the VNR Hall Bookings Admin.</p>
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Hall Name:</strong> ${dbBooking.hallname || "N/A"}</li>
                <li><strong>Date of Event:</strong> ${dbBooking.formattedDate || dbBooking.date || "N/A"}</li>
                <li><strong>Slot:</strong> ${dbBooking.slot || "N/A"}</li>
                <li><strong>Event Name:</strong> ${dbBooking.eventName || "N/A"}</li>
                <li><strong>Event Description:</strong> ${dbBooking.eventDescription || "N/A"}</li>
                <li><strong>Date of Booking:</strong> ${new Date(dbBooking.dateOfBooking).toLocaleString() || "N/A"}</li>
              </ul>
              ${note ? `<h3>Admin Note:</h3><p>${note}</p>` : ""}
              <p>Thank you for choosing VNR Campus Hall Bookings.</p>
              <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
            </div>
          `;

          try {
            await sendEmaill(user.email, subject, htmlContent);
          } catch (err) {
            console.error("Error sending booking confirmation email:", err);
          }
        }
      }
      return res.send({ message: "Booking has been verified and user notified" });
    } else {
      return res.send({ message: "Booking has already been verified" });
    }
  })
);
adminApp.put(
  "/reject-user/:email",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const usersCollection = req.app.get("usersCollection");
    const email = req.params.email.toLowerCase();

    if (!usersCollection) {
      return res.status(500).send({ message: "Users collection not configured." });
    }

    const dbUser = await usersCollection.findOne({ email });

    if (!dbUser) {
      return res.status(404).send({ message: "User not found" });
    }

    if (dbUser.activeStatus === true && dbUser.verifyStatus === false) {
      await usersCollection.updateOne(
        { email },
        { $set: { activeStatus: false, verifyStatus: true } }
      );

      const subject = "Registration Rejected - VNR Campus Hall Bookings";
      const htmlContent = `
        <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;
          border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
          <h2 style="color:#dc3545;">Registration Rejected</h2>
          <p>Dear ${dbUser.firstname || "User"},</p>
          <p>We regret to inform you that your registration request for VNR Campus Hall Bookings has been rejected.</p>
          <p>If you have any questions, please contact the administration.</p>
          <p>Regards,<br/><strong>VNR Campus Hall Bookings Team</strong></p>
        </div>
      `;

      try {
        await sendEmaill(dbUser.email, subject, htmlContent);
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr);
      }

      return res.send({ message: "User has been rejected and notified" });
    } else {
      return res.status(400).send({ message: "User is either already rejected or approved" });
    }
  })
);

adminApp.put(
  "/reject-booking/:bookingID",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const bookingID = Number(req.params.bookingID);
    const { note } = req.body;
    const dbBooking = await bookingsCollection.findOne({ bookingID });

    if (!dbBooking) {
      return res.status(404).send({ message: "Booking doesn't exist" });
    }

    if (dbBooking.activeStatus === false) {
      return res.status(400).send({ message: "Booking has been deactivated" });
    }

    if (dbBooking.rejectStatus !== true) {
      const updateData = { rejectStatus: true, verifyStatus: true };
      if (note) {
        updateData.rejectionNote = note;
        updateData.rejectionNoteDate = new Date().toISOString();
      }
      
      await bookingsCollection.updateOne({ bookingID }, { $set: updateData });


      const usersCollection = req.app.get("usersCollection");
      if (usersCollection) {
        const user = await usersCollection.findOne({ email: dbBooking.bookingEmail });
        if (user && user.email) {
          const subject = "Booking Rejected - VNR Hall Booking";
          const htmlContent = `
            <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;
              border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
              <h2 style="color:#dc3545;">Booking Rejected</h2>
              <p>Dear ${user.firstname || "User"},</p>
              <p>We regret to inform you that your booking has been rejected by the VNR Hall Bookings Admin.</p>
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Hall Name:</strong> ${dbBooking.hallname || "N/A"}</li>
                <li><strong>Date of Event:</strong> ${dbBooking.formattedDate || dbBooking.date || "N/A"}</li>
                <li><strong>Slot:</strong> ${dbBooking.slot || "N/A"}</li>
                <li><strong>Event Name:</strong> ${dbBooking.eventName || "N/A"}</li>
                <li><strong>Event Description:</strong> ${dbBooking.eventDescription || "N/A"}</li>
                <li><strong>Date of Booking:</strong> ${new Date(dbBooking.dateOfBooking).toLocaleString() || "N/A"}</li>
              </ul>
              ${note ? `<h3>Rejection Reason:</h3><p>${note}</p>` : ""}
              <p>If you have questions, please contact the administration.</p>
              <p>Regards,<br/><strong>VNR Campus Hall Bookings</strong></p>
            </div>
          `;

          try {
            await sendEmaill(user.email, subject, htmlContent);
          } catch (err) {
            console.error("Error sending booking rejection email:", err);
          }
        }
      }
      return res.send({ message: "Booking has been rejected and user notified" });
    } else {
      return res.send({ message: "Booking has already been rejected" });
    }
  })
);

adminApp.put(
  "/block-booking/:bookingID",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
    const bookingsCollection = req.app.get("bookingsCollection");
    const usersCollection = req.app.get("usersCollection");
    const bookingID = Number(req.params.bookingID);

    if (!bookingsCollection) {
      return res.status(500).send({ message: "Bookings collection not configured." });
    }

    if (!usersCollection) {
      return res.status(500).send({ message: "Users collection not configured." });
    }

    const dbBooking = await bookingsCollection.findOne({ bookingID });
    if (!dbBooking) {
      return res.status(404).send({ message: "Booking doesn't exist" });
    }

    let resMessage = "";

    if (dbBooking.activeStatus === true && dbBooking.verifyStatus === true) {
      await bookingsCollection.updateOne({ bookingID }, { $set: { activeStatus: false } });
      resMessage = "Booking has been blocked";

      const user = await usersCollection.findOne({ email: dbBooking.bookingEmail });
      if (user && user.email) {
        const subject = "Booking Blocked - VNR Hall Bookings";
        const htmlContent = `
          <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;
            border-radius:8px; font-family:Arial, sans-serif; color:#333; line-height:1.6;">
            <h2 style="color:#dc3545;">Booking Blocked</h2>
            <p>Dear ${user.firstname || "User"},</p>
            <p>Due to some unforeseen and last minute changes, your <strong>confirmed booking</strong> has been blocked.</p>

            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Hall Name:</strong> ${dbBooking.hallname || "N/A"}</li>
              <li><strong>Date of Event:</strong> ${dbBooking.formattedDate || dbBooking.date || "N/A"}</li>
              <li><strong>Slot:</strong> ${dbBooking.slot || "N/A"}</li>
              <li><strong>Event Name:</strong> ${dbBooking.eventName || "N/A"}</li>
              <li><strong>Event Description:</strong> ${dbBooking.eventDescription || "N/A"}</li>
              <li><strong>Date of Booking:</strong> ${dbBooking.dateOfBooking || "N/A"}</li>
              <li><strong>Booking ID:</strong> ${dbBooking.bookingID || "N/A"}</li>
            </ul>

            <p>Please contact the admin for more details.</p>
            <p>Thank you for your understanding.</p>
            <p>Regards,<br/><strong>VNR Hall Bookings Team</strong></p>
          </div>
        `;


        try {
          await sendEmaill(user.email, subject, htmlContent);
        } catch (err) {
          console.error("Error sending booking blocking email:", err);
        }
      }
    } else if (dbBooking.activeStatus === false) {
      const conflict = await bookingsCollection.findOne({
        bookingID: { $ne: bookingID },
        hallname: dbBooking.hallname,
        date: dbBooking.date,
        slot: dbBooking.slot,
        activeStatus: true,
        verifyStatus: true,
      });
      if (conflict) {
        return res.status(409).send({ message: "This slot has been booked and cannot be unblocked" });
      }
      await bookingsCollection.updateOne({ bookingID }, { $set: { activeStatus: true } });
      resMessage = "Booking has been unblocked";
    } else {
      resMessage = "Booking status unchanged";
    }

    res.send({ message: resMessage });
  })
);

module.exports = adminApp;