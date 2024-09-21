const socket = io();

let localStream;
let peerConnection;
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const startCallButton = document.getElementById("startCall");
const disconnectCallButton = document.getElementById("disconnectCall");
const sendMessageButton = document.getElementById("sendMessage");

startCallButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);
  peerConnection.addStream(localStream);

  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit("candidate", candidate);
    }
  };

  peerConnection.onaddstream = (event) => {
    remoteVideo.srcObject = event.stream;
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);
};

disconnectCallButton.onclick = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    socket.emit("disconnectCall");
  }
};

sendMessageButton.onclick = () => {
  const message = chatInput.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    appendMessage(`You: ${message}`);
    chatInput.value = "";
  }
};

socket.on("chatMessage", (message) => {
  appendMessage(`Peer: ${message}`);
});

socket.on("offer", async (offer) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.addStream(localStream);

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("candidate", candidate);
      }
    };
    peerConnection.onaddstream = (event) => {
      remoteVideo.srcObject = event.stream;
    };
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", (answer) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectCall", () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
  }
});

function appendMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
