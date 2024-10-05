const {
  TikTokConnectionWrapper,
  getGlobalConnectionCount,
} = require("../services/connectionWrapper");
const { clientBlocked } = require("./limiter");

let isConnectedToTiktok = false;

const socketController = (io) => {
  io.on("connection", (socket) => {
    let tiktokConnectionWrapper;
    console.info(
      "New connection from origin",
      socket.handshake.headers["origin"] || socket.handshake.headers["referer"]
    );
    socket.on("connectTiktok", (data, options) => {
      // Prohibit the client from specifying these options (for security reasons)
      if (typeof options === "object" && options) {
        delete options.requestOptions;
        delete options.websocketOptions;
      } else {
        options = {};
      }
      const { uniqueId, sessionId } = data;
      socket.join(uniqueId);
      // Connect to the given username (uniqueId)
      try {
        tiktokConnectionWrapper = new TikTokConnectionWrapper(
          uniqueId,
          { sessionId: sessionId },
          true
        );
        tiktokConnectionWrapper.connect();
      } catch (err) {
        io.to(uniqueId).emit("tiktokDisconnected", err.toString());
        return;
      }

      // Redirect wrapper control events once
      tiktokConnectionWrapper.once("connected", (state) => {
        isConnectedToTiktok = true;
        io.to(uniqueId).emit("tiktokConnected", state);
      });
      tiktokConnectionWrapper.once("disconnected", (reason) => {
        isConnectedToTiktok = false;
        io.to(uniqueId).emit("tiktokDisconnected", reason);
      });

      // Notify client when stream ends
      tiktokConnectionWrapper.connection.on("streamEnd", () => {
        isConnectedToTiktok = false;
        io.to(uniqueId).emit("streamEnd");
      });

      // Redirect message events
      tiktokConnectionWrapper.connection.on("roomUser", (msg) =>
        io.to(uniqueId).emit("roomUser", msg)
      );
      tiktokConnectionWrapper.connection.on("member", (msg) =>
        io.to(uniqueId).emit("member", msg)
      );
      tiktokConnectionWrapper.connection.on("chat", (msg) =>
        io.to(uniqueId).emit("chat", msg)
      );
      tiktokConnectionWrapper.connection.on("gift", (msg) =>
        io.to(uniqueId).emit("gift", msg)
      );
      tiktokConnectionWrapper.connection.on("social", (msg) =>
        io.to(uniqueId).emit("social", msg)
      );
      tiktokConnectionWrapper.connection.on("like", (msg) =>
        io.to(uniqueId).emit("like", msg)
      );
      tiktokConnectionWrapper.connection.on("questionNew", (msg) =>
        io.to(uniqueId).emit("questionNew", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicBattle", (msg) =>
        io.to(uniqueId).emit("linkMicBattle", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicArmies", (msg) =>
        io.to(uniqueId).emit("linkMicArmies", msg)
      );
      tiktokConnectionWrapper.connection.on("liveIntro", (msg) =>
        io.to(uniqueId).emit("liveIntro", msg)
      );
      tiktokConnectionWrapper.connection.on("emote", (msg) =>
        io.to(uniqueId).emit("emote", msg)
      );
      tiktokConnectionWrapper.connection.on("envelope", (msg) =>
        io.to(uniqueId).emit("envelope", msg)
      );
      tiktokConnectionWrapper.connection.on("subscribe", (msg) =>
        io.to(uniqueId).emit("subscribe", msg)
      );
    });
    socket.on("printOrder", (msg) => {
      console.log("printOrder", msg);
      io.to(uniqueId).emit("print_order", msg);
    });

    socket.on("disconnect", () => {
      if (tiktokConnectionWrapper) {
        tiktokConnectionWrapper.disconnect();
      }
    });
    socket.on("disconnectTiktok", () => {
      console.log("=========> client send: disconnectTiktok");
      if (tiktokConnectionWrapper) {
        tiktokConnectionWrapper.disconnect();
      }
    });
  });

  // Emit global connection statistics
  setInterval(() => {
    io.emit("statistic", { globalConnectionCount: getGlobalConnectionCount() });
  }, 5000);
};

module.exports = socketController;
