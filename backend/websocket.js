module.exports = (server, app) => {
  const WebSocket = require("ws");
  const wss = new WebSocket.Server({ server, path: "/ws" });
  console.log("🔗 WebSocket server started on path /ws");

  wss.on("connection", (ws, req) => {
    console.log("🔗 New WebSocket client connected from", req.url);

    ws.on("message", (message) => {
      try {
        const data = typeof message === "string" ? message : message.toString();
        const jsonData = JSON.parse(data);

        if (jsonData.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", message: "pong" }));
        }
      } catch (error) {
        console.warn("⚠️ WebSocket Message Error:", error.message);
        ws.send(JSON.stringify({ error: "Invalid message format" }));
      }
    });

    ws.on("error", (err) => console.error("⚠️ WebSocket Error:", err.message));

    ws.on("close", (code, reason) => {
      console.log(`❌ WebSocket closed: ${code}, Reason: ${reason || "No reason provided"}`);
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: "Connected to WebSocket Server" }));
    }
  });

  const broadcast = (data) => {
    if (wss.clients.size === 0) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  const sendAnnouncements = async () => {
    try {
      const announcements = await app.get("announcementCollections").find().toArray();
      broadcast({ type: "announcement", announcements });
    } catch (error) {
      console.error("❌ Error fetching announcements:", error);
    }
  };

  sendAnnouncements();
  setInterval(sendAnnouncements, 5000);
};
