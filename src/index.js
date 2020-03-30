import io from "socket.io-client"
import Connection from "./connection"
import Sequencer from "./sequencer"
import "./index.css"

let socketId
let localStream
let connections = {}
let socket
let sequencer

function changeBPM(event) {
  this.sequencer.bpm = parseInt(event.currentTarget.value)

  socket.emit("bpm", this.sequencer.bpm)
}

function updateBPM(newBPM) {
  this.sequencer.bpm = newBPM
  document.getElementById("bpm").value = newBPM
}

/**
 * Send MIDI START signal.
 */
function part(id) {
  var audio = document.querySelector('[data-socket="'+ id +'"]')
  var parentDiv = audio.parentElement

  audio.parentElement.parentElement.removeChild(parentDiv)
}

async function join(id, count, clients, currentlyPlaying) {
  sequencer.playing = currentlyPlaying

  // Connect to all clients
  clients.forEach(function(client) {
    if (!connections[client]) {
      connections[client] = new Connection(client, socket, localStream)
    }
  })

  // Create an offer to connect with your local description
  if (count >= 2) {
    await connections[id].createOffer()
  }

  // Send the MIDI Start signal locally if already playing
  if (sequencer.playing) {
    sequencer.start()
  }
}

/**
 * Fired when a socket channel is connected to
 */
function connect() {
  socketId = socket.id

  socket.on('join', join)
  socket.on('part', part)
  socket.on('bpm', updateBPM)
  socket.on('start', sequencer.start.bind(sequencer))
  socket.on('stop', sequencer.stop.bind(sequencer))
}

/**
 * Emit the socket event indicated by the ID of the button.
 */
function buttonClick(event) {
  socket.emit(event.currentTarget.id)
}

async function pageReady() {
  const localAudio = document.querySelector(".mixer__track--local audio")
  const input = document.querySelector("input[type='number']")
  const buttons = document.getElementsByTagName("button")
  const secure = (location.protocol === "https")

  if (navigator.mediaDevices.getUserMedia) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      })
    } catch (e) {
      alert(e)
    }

    localAudio.srcObject = localStream
  } else {
    alert('Your browser does not support getUserMedia API. Audio is disabled.')
  }

  if (navigator.requestMIDIAccess) {
    const midi = await navigator.requestMIDIAccess({ sysex: true })
    sequencer = new Sequencer(midi)
  } else {
    alert('Your browser does not support the Web MIDI API. MIDI is disabled.')
  }

  socket = io.connect(location.href, { secure })

  socket.on('signal', signal)
  socket.on('connect', connect)
  input.addEventListener("change", changeBPM)
  buttons.forEach(button => button.addEventListener("click", buttonClick))
}

async function signal(fromId, message) {
  // Parse the incoming signal
  var { sdp, ice } = JSON.parse(message)

  // Make sure it's not coming from yourself
  if (fromId !== socketId) {
    if (sdp) {
      await connections[fromId].setRemoteDescription(sdp)

      if (sdp.type === 'offer') {
        await connections[fromId].setLocalDescription()
      }
    }

    if (ice) {
      connections[fromId].addIceCandidate(ice)
    }
  }
}

document.addEventListener("DOMContentLoaded", pageReady)
