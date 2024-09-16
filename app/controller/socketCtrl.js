const {
  TikTokConnectionWrapper,
  getGlobalConnectionCount,
} = require("../services/connectionWrapper");
const { clientBlocked } = require("./limiter");

let isConnectedToTiktok = false;
let tiktokConnectionWrapper;

const socketController = (io) => {
  io.on("connection", (socket) => {
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

      if (isConnectedToTiktok) {
        io.emit("server-status", {
          status: "fail",
          msg: "Already connect to tiktok",
        });
        return;
      }

      // Connect to the given username (uniqueId)
      try {
        tiktokConnectionWrapper = new TikTokConnectionWrapper(
          uniqueId,
          { sessionId: sessionId },
          true
        );
        tiktokConnectionWrapper.connect();
      } catch (err) {
        io.emit("tiktokDisconnected", err.toString());
        return;
      }

      // Redirect wrapper control events once
      tiktokConnectionWrapper.once("connected", (state) => {
        isConnectedToTiktok = true;
        io.emit("tiktokConnected", state);
      });
      tiktokConnectionWrapper.once("disconnected", (reason) => {
        isConnectedToTiktok = false;
        io.emit("tiktokDisconnected", reason)
      }
      );

      // Notify client when stream ends
      tiktokConnectionWrapper.connection.on("streamEnd", () => {
        isConnectedToTiktok = false;
        io.emit("streamEnd")
      }
      );

      // Redirect message events
      tiktokConnectionWrapper.connection.on("roomUser", (msg) =>
        io.emit("roomUser", msg)
      );
      tiktokConnectionWrapper.connection.on("member", (msg) =>
        io.emit("member", msg)
      );
      tiktokConnectionWrapper.connection.on("chat", (msg) =>
        io.emit("chat", msg)
      );
      tiktokConnectionWrapper.connection.on("gift", (msg) =>
        io.emit("gift", msg)
      );
      tiktokConnectionWrapper.connection.on("social", (msg) =>
        io.emit("social", msg)
      );
      tiktokConnectionWrapper.connection.on("like", (msg) =>
        io.emit("like", msg)
      );
      tiktokConnectionWrapper.connection.on("questionNew", (msg) =>
        io.emit("questionNew", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicBattle", (msg) =>
        io.emit("linkMicBattle", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicArmies", (msg) =>
        io.emit("linkMicArmies", msg)
      );
      tiktokConnectionWrapper.connection.on("liveIntro", (msg) =>
        io.emit("liveIntro", msg)
      );
      tiktokConnectionWrapper.connection.on("emote", (msg) =>
        io.emit("emote", msg)
      );
      tiktokConnectionWrapper.connection.on("envelope", (msg) =>
        io.emit("envelope", msg)
      );
      tiktokConnectionWrapper.connection.on("subscribe", (msg) =>
        io.emit("subscribe", msg)
      );
    });
    socket.on("setUniqueId", (uniqueId, options) => {
      // Prohibit the client from specifying these options (for security reasons)
      if (typeof options === "object" && options) {
        delete options.requestOptions;
        delete options.websocketOptions;
      } else {
        options = {};
      }

      console.log("tienvv", options);

      // Session ID in .env file is optional
      //   if (process.env.SESSIONID) {
      //     options.sessionId = process.env.SESSIONID;
      //     console.info("Using SessionId");
      //   }

      // Check if rate limit exceeded
      if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
        io.emit(
          "tiktokDisconnected",
          "You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid that the server IP gets blocked by TokTok."
        );
        return;
      }

      // Connect to the given username (uniqueId)
      try {
        tiktokConnectionWrapper = new TikTokConnectionWrapper(
          uniqueId,
          options,
          true
        );
        tiktokConnectionWrapper.connect();
      } catch (err) {
        io.emit("tiktokDisconnected", err.toString());
        return;
      }

      // Redirect wrapper control events once
      tiktokConnectionWrapper.once("connected", (state) =>
        io.emit("tiktokConnected", state)
      );
      tiktokConnectionWrapper.once("disconnected", (reason) =>
        io.emit("tiktokDisconnected", reason)
      );

      // Notify client when stream ends
      tiktokConnectionWrapper.connection.on("streamEnd", () =>
        io.emit("streamEnd")
      );

      // Redirect message events
      tiktokConnectionWrapper.connection.on("roomUser", (msg) =>
        io.emit("roomUser", msg)
      );
      tiktokConnectionWrapper.connection.on("member", (msg) =>
        io.emit("member", msg)
      );
      tiktokConnectionWrapper.connection.on("chat", (msg) =>
        io.emit("chat", msg)
      );
      tiktokConnectionWrapper.connection.on("gift", (msg) =>
        io.emit("gift", msg)
      );
      tiktokConnectionWrapper.connection.on("social", (msg) =>
        io.emit("social", msg)
      );
      tiktokConnectionWrapper.connection.on("like", (msg) =>
        io.emit("like", msg)
      );
      tiktokConnectionWrapper.connection.on("questionNew", (msg) =>
        io.emit("questionNew", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicBattle", (msg) =>
        io.emit("linkMicBattle", msg)
      );
      tiktokConnectionWrapper.connection.on("linkMicArmies", (msg) =>
        io.emit("linkMicArmies", msg)
      );
      tiktokConnectionWrapper.connection.on("liveIntro", (msg) =>
        io.emit("liveIntro", msg)
      );
      tiktokConnectionWrapper.connection.on("emote", (msg) =>
        io.emit("emote", msg)
      );
      tiktokConnectionWrapper.connection.on("envelope", (msg) =>
        io.emit("envelope", msg)
      );
      tiktokConnectionWrapper.connection.on("subscribe", (msg) =>
        io.emit("subscribe", msg)
      );
    });

    socket.on("printOrder", (msg) => {
      console.log("printOrder", msg);
      socket.broadcast.emit("print_order", msg);
    });

    socket.on("disconnect", () => {
      // if (tiktokConnectionWrapper) {
      //   tiktokConnectionWrapper.disconnect();
      // }
    });
    socket.on("disconnectTiktok", () => {
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
