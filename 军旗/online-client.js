(function () {
  "use strict";

  class OnlineClient {
    constructor(url) {
      this.url = url || "ws://127.0.0.1:8788";
      this.socket = null;
      this.status = "idle";
      this.messageListeners = [];
      this.statusListeners = [];
    }

    connect() {
      if (this.socket && this.status === "open") return Promise.resolve();
      this.setStatus("connecting");
      return new Promise((resolve, reject) => {
        try {
          if (typeof WebSocket !== "undefined") {
            const socket = new WebSocket(this.url);
            this.socket = socket;
            socket.onopen = () => {
              this.setStatus("open");
              resolve();
            };
            socket.onclose = () => this.setStatus("closed");
            socket.onerror = (error) => {
              this.setStatus("error");
              reject(error);
            };
            socket.onmessage = (event) => this.emitMessage(event.data);
            return;
          }
          if (typeof tt !== "undefined" && tt.connectSocket) {
            const socket = tt.connectSocket({ url: this.url });
            this.socket = socket;
            socket.onOpen(() => {
              this.setStatus("open");
              resolve();
            });
            socket.onClose(() => this.setStatus("closed"));
            socket.onError((error) => {
              this.setStatus("error");
              reject(error);
            });
            socket.onMessage((event) => this.emitMessage(event.data));
            return;
          }
          reject(new Error("当前环境不支持 WebSocket"));
        } catch (error) {
          this.setStatus("error");
          reject(error);
        }
      });
    }

    send(message) {
      const data = JSON.stringify(message);
      if (!this.socket || this.status !== "open") return false;
      if (typeof WebSocket !== "undefined" && this.socket instanceof WebSocket) {
        this.socket.send(data);
        return true;
      }
      if (this.socket.send) {
        this.socket.send({ data });
        return true;
      }
      return false;
    }

    close() {
      if (!this.socket) return;
      if (typeof WebSocket !== "undefined" && this.socket instanceof WebSocket) this.socket.close();
      else if (this.socket.close) this.socket.close({ code: 1000, reason: "client close" });
      this.socket = null;
      this.setStatus("closed");
    }

    onMessage(listener) {
      this.messageListeners.push(listener);
      return () => {
        this.messageListeners = this.messageListeners.filter((item) => item !== listener);
      };
    }

    onStatus(listener) {
      this.statusListeners.push(listener);
      return () => {
        this.statusListeners = this.statusListeners.filter((item) => item !== listener);
      };
    }

    setStatus(status) {
      this.status = status;
      this.statusListeners.forEach((listener) => listener(status));
    }

    emitMessage(raw) {
      try {
        const message = JSON.parse(String(raw));
        this.messageListeners.forEach((listener) => listener(message));
      } catch (error) {
        this.messageListeners.forEach((listener) => listener({ type: "error", code: "bad_json", message: "服务器消息无法解析" }));
      }
    }
  }

  window.OnlineClient = OnlineClient;
})();
