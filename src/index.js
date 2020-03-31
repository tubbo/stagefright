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
  sequencer.bpm = parseInt(event.currentTarget.value)

  socket.emit("bpm", sequencer.bpm)
}

function updateBPM(newBPM) {
  sequencer.bpm = newBPM
  document.getElementById("bpm").value = newBPM
}

/**
 * Remove element when a client disconnects.
 */
function part(id) {
  var audio = document.querySelector('[data-socket="'+ id +'"]')
  var parentDiv = audio.parentElement

  parentDiv.remove()
}

/**
 * Ensure all peers are connected when each user connects.
 */
async function join(id, count, clients, currentlyPlaying, nickname, bpm) {
  sequencer.playing = currentlyPlaying
  updateBPM(bpm)

  // Connect to all clients
  clients.forEach(function({ client, nick }) {
    if (!connections[client]) {
      connections[client] = new Connection(client, socket, localStream, nick)
    }
  })

  // Create an offer to connect with your local description
  if (count >= 2 && connections[id]) {
    await connections[id].createOffer()
  }

  // Send the MIDI Start signal locally if already playing
  if (sequencer.playing) {
    sequencer.start()
  }

  if (nickname) {
    document.getElementById("nick").value = nickname
  }
}

/**
 * Bind other socket events when connected to the server.
 */
function connect() {
  const start = sequencer.start.bind(sequencer)
  const stop = sequencer.stop.bind(sequencer)
  socketId = socket.id

  socket.on('join', join)
  socket.on('part', part)
  socket.on('bpm', updateBPM)
  socket.on('start', start)
  socket.on('stop', stop)
  socket.on('chat', renderChat)
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
  const buttons = document.querySelectorAll("button")
  const secure = (location.protocol === "https")
  const form = document.getElementById("send-message")
  const nick = document.getElementById("nick")

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
    const inputs = document.querySelectorAll("button, input")

    inputs.forEach(input => input.setAttribute("disabled", "disabled"))
    alert('Your browser does not support the Web MIDI API. MIDI is disabled.')
  }

  socket = io.connect(location.href, { secure })

  socket.on('signal', signal)
  socket.on('connect', connect)
  input.addEventListener("change", changeBPM)
  buttons.forEach(button => button.addEventListener("click", buttonClick))
  form.addEventListener("submit", sendChatMessage)
  nick.addEventListener("change", changeNickname)
}

function changeNickname(event) {
  event.preventDefault()

  const nick = event.currentTarget.value

  socket.emit("nick", socketId, nick)
}

function sendChatMessage(event) {
  event.preventDefault()

  const message = event.currentTarget.querySelector("input").value

  socket.emit("chat", socketId, message)
}

function renderChat(nick, message) {
  const container = document.querySelector(".mixer__chat-messages")
  const chat = document.createElement("div")

  chat.innerText = `<${nick}> ${message}`
  container.scrollTop = container.scrollHeight

  chat.classList.add("chat__message")
  container.appendChild(chat)
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
