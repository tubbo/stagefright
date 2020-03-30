const PEER_CONNECTION_CONFIG = {
  'iceServers': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
}

/**
 * Audio Stream from a Client Connection.
 */
export default class Connection {
  constructor(id, socket, localStream) {
    this.id = id
    this.socket = socket
    this.peer = new RTCPeerConnection(PEER_CONNECTION_CONFIG)
    this.peer.onicecandidate = this.emitSignal.bind(this)
    this.peer.onaddstream = this.addTrack.bind(this)
    this.peer.addStream(localStream)
  }

  emitSignal(event) {
    const ice = event.candidate

    if (ice) {
      const message = JSON.stringify({ ice })

      this.socket.emit("signal", this.id, message)
    }
  }

  addTrack(event) {
    const audio = document.createElement('audio')
    const track = document.createElement('div')
    const mixer = document.querySelector('.mixer')

    audio.setAttribute('data-socket', this.id)
    audio.srcObject   = event.stream
    audio.autoplay    = true
    audio.controls    = true

    track.classList.add("mixer__track")
    track.innerText = this.id
    track.appendChild(audio)
    mixer.appendChild(track)
  }

  async createOffer() {
    const description = await this.peer.createOffer()

    await this.peer.setLocalDescription(description)

    const message = JSON.stringify({'sdp': this.peer.localDescription})

    this.socket.emit('signal', this.id, message)
  }

  async setRemoteDescription(sdp) {
    const description = new RTCSessionDescription(sdp)

    await this.peer.setRemoteDescription(description)
  }

  async setLocalDescription() {
    const description = await this.peer.createAnswer()

    await this.peer.setLocalDescription(description)

    const sdp = this.peer.localDescription
    const message = JSON.stringify({ sdp })

    this.socket.emit('signal', this.id, message)
  }

  addIceCandidate(ice) {
    const candidate = new RTCIceCandidate(ice)

    this.peer.addIceCandidate(candidate)
  }
}
