/**
 * WebRTC Mesh Network Manager for Virtual Workspace
 * Handles local media (Camera/Mic) and Peer-to-Peer connections.
 */

const peers = {}; // map of socketId -> RTCPeerConnection
let localStream = null;

// STUN servers for NAT traversal
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Start Local Media
async function toggleLocalMedia(type) {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Mute both by default on initial grab
      localStream.getVideoTracks()[0].enabled = false;
      localStream.getAudioTracks()[0].enabled = false;
      
      // Add stream tracks to all existing peer connections
      for (const socketId in peers) {
        localStream.getTracks().forEach(track => {
          peers[socketId].addTrack(track, localStream);
        });
        // Negotiation will automatically be triggered by pc.onnegotiationneeded
      }
      
      // Setup local video preview (if we want one, or just attach to our own avatar)
      attachMediaToAvatar(socket.id, localStream);
    } catch (err) {
      console.error('Error accessing media devices.', err);
      alert('Could not access Camera/Mic. Please check permissions.');
      return;
    }
  }

  if (type === 'video') {
    const track = localStream.getVideoTracks()[0];
    track.enabled = !track.enabled;
    socket.emit('updateMedia', { cameraEnabled: track.enabled });
    
    // Toggle video CSS visibility on avatar
    const myAvatar = document.querySelector(`#avatar-${currentUser._id} video`);
    if (myAvatar) myAvatar.style.display = track.enabled ? 'block' : 'none';
    
    return track.enabled;
  }
  
  if (type === 'audio') {
    const track = localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    socket.emit('updateMedia', { micEnabled: track.enabled });
    return track.enabled;
  }
}

// ── Connection Management ──

function createPeerConnection(targetSocketId) {
  const pc = new RTCPeerConnection(rtcConfig);
  peers[targetSocketId] = pc;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice-candidate', {
        targetSocketId,
        candidate: event.candidate
      });
    }
  };

  pc.onnegotiationneeded = () => {
    makeCall(targetSocketId);
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    // Check if this stream is the active screen share
    if (activeScreenStreamId && stream.id === activeScreenStreamId) {
      const video = document.getElementById('screen-share-video');
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play().catch(e => console.warn(e));
      }
    } else {
      // Otherwise, it's a regular camera/mic track, attach it to their avatar
      attachMediaToAvatar(targetSocketId, stream);
    }
  };

  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  return pc;
}

// When we join the room and receive the list of users, we initiate calls to everyone
function initiateCallsToAll(roomUsers) {
  roomUsers.forEach(user => {
    if (user.socketId !== socket.id) {
      makeCall(user.socketId);
    }
  });
}

async function makeCall(targetSocketId) {
  let pc = peers[targetSocketId];
  if (!pc) pc = createPeerConnection(targetSocketId);
  
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc-offer', {
      targetSocketId,
      sdp: pc.localDescription
    });
  } catch (err) {
    console.error('Error creating offer', err);
  }
}

// ── Signaling Handlers ──

socket.on('webrtc-offer', async ({ callerSocketId, sdp }) => {
  let pc = peers[callerSocketId];
  if (!pc) pc = createPeerConnection(callerSocketId);
  
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc-answer', {
      targetSocketId: callerSocketId,
      sdp: pc.localDescription
    });
  } catch (err) {
    console.error('Error handling offer', err);
  }
});

socket.on('webrtc-answer', async ({ callerSocketId, sdp }) => {
  const pc = peers[callerSocketId];
  if (pc) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('Error handling answer', err);
    }
  }
});

socket.on('webrtc-ice-candidate', async ({ callerSocketId, candidate }) => {
  const pc = peers[callerSocketId];
  if (pc) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate', err);
    }
  }
});

socket.on('workspaceUserLeft', ({ socketId }) => {
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }
});

// Global to track active screen share stream id
let activeScreenStreamId = null;
let screenStream = null;
let screenTrackSenderMap = {}; // socketId -> RTCRtpSender

socket.on('screenShareState', ({ active, socketId, streamId }) => {
  const modal = document.getElementById('screen-share-modal');
  const video = document.getElementById('screen-share-video');
  const controls = document.getElementById('screen-share-controls');
  
  if (active) {
    activeScreenStreamId = streamId;
    modal.classList.add('open');
    controls.style.display = 'none'; // Remote users can't stop it
    
    // Auto-close object panel if it's open to give full view
    document.getElementById('object-panel').classList.remove('open');
  } else {
    activeScreenStreamId = null;
    modal.classList.remove('open');
    if (video.srcObject) {
      video.srcObject = null;
    }
  }
});

async function startScreenShare() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = screenStream.getVideoTracks()[0];
    
    track.onended = () => {
      stopScreenShare();
    };

    // Add track to all peers
    for (const socketId in peers) {
      const pc = peers[socketId];
      const sender = pc.addTrack(track, screenStream);
      screenTrackSenderMap[socketId] = sender;
    }
    
    // Attach to local modal
    const modal = document.getElementById('screen-share-modal');
    const video = document.getElementById('screen-share-video');
    const controls = document.getElementById('screen-share-controls');
    
    video.srcObject = screenStream;
    video.onloadedmetadata = () => video.play().catch(e => console.warn(e));
    
    modal.classList.add('open');
    controls.style.display = 'flex';
    
    socket.emit('screenShareState', { active: true, streamId: screenStream.id });
    
  } catch (err) {
    console.error('Error sharing screen:', err);
  }
}

function stopScreenShare() {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }
  
  // Remove from peers
  for (const socketId in peers) {
    const pc = peers[socketId];
    const sender = screenTrackSenderMap[socketId];
    if (sender) {
      pc.removeTrack(sender);
    }
  }
  screenTrackSenderMap = {};
  
  const modal = document.getElementById('screen-share-modal');
  const video = document.getElementById('screen-share-video');
  modal.classList.remove('open');
  if (video.srcObject) video.srcObject = null;
  
  socket.emit('screenShareState', { active: false });
}

function closeScreenShareModal() {
  document.getElementById('screen-share-modal').classList.remove('open');
}

// ── DOM Helper ──

function attachMediaToAvatar(socketId, stream) {
  // Find the userId for this socketId
  let userId;
  if (socketId === socket.id) {
    userId = currentUser._id;
  } else {
    const userState = workspaceUsers.find(u => u.socketId === socketId);
    if (!userState) return;
    userId = userState.userId;
  }

  const avatarCircle = document.querySelector(`#avatar-${userId} .avatar-circle`);
  if (!avatarCircle) {
    // Retry in 1 second if DOM isn't ready
    setTimeout(() => attachMediaToAvatar(socketId, stream), 1000);
    return;
  }

  // Create or update video element
  let videoEl = avatarCircle.querySelector('video');
  if (!videoEl) {
    videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    
    // Mute local video so you don't hear yourself
    if (socketId === socket.id) {
      videoEl.muted = true;
      videoEl.style.display = 'none'; // hide until explicitly turned on
    }
    
    // Style the video to fit the circle perfectly
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'cover';
    videoEl.style.borderRadius = '50%';
    videoEl.style.position = 'absolute';
    videoEl.style.top = '0';
    videoEl.style.left = '0';
    videoEl.style.zIndex = '1'; // Above initials
    
    avatarCircle.appendChild(videoEl);
  }

  if (videoEl.srcObject !== stream) {
    videoEl.srcObject = stream;
    
    // Explicitly call play to handle browsers that require it for WebRTC streams
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
    };
  }
  
  // Also update visibility based on state
  if (socketId !== socket.id) {
    const state = workspaceUsers.find(u => u.socketId === socketId);
    if (state) {
      videoEl.style.display = state.cameraEnabled ? 'block' : 'none';
    }
  }
  
  // Apply proximity filtering immediately
  applyProximityAudio();
}

// ── Proximity Audio Router ──
// This is called whenever our zone changes, or remote zone changes, or a new track arrives.
function applyProximityAudio() {
  workspaceUsers.forEach(u => {
    if (u.socketId === socket.id) return; // Skip self
    
    const avatarCircle = document.querySelector(`#avatar-${u.userId} .avatar-circle`);
    if (avatarCircle) {
      const videoEl = avatarCircle.querySelector('video');
      if (videoEl) {
        // If in same zone, full volume, else muted.
        if (u.currentZone === currentZone) {
          videoEl.volume = 1;
        } else {
          videoEl.volume = 0;
        }
      }
    }
  });
}
