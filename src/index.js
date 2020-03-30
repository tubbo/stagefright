import io from "socket.io-client"

let socketId
let localStream
let connections = {}
let socket
let midi
let playing
let bpm

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
}

function changeBPM(event) {
  bpm = parseInt(event.currentTarget.value)

  socket.emit("bpm", bpm)
}

function updateBPM(newBPM) {
  bpm = newBPM
  document.getElementById("bpm").value = bpm
}

/**
 * Send MIDI START signal.
 */
function start() {
  midi.outputs.forEach(output => {
    output.send([0xFA])
    output.send([0xF8])
  })

  setTimeout(sync, tempo())
  playing = true
}

/**
 * Send MIDI CLOCK signal.
 */
function sync() {
  midi.outputs.forEach(output => output.send([0xF8]))

  if (playing) {
    setTimeout(sync, tempo())
  }
}

/**
 * Send MIDI STOP signal.
 */
function stop() {
  midi.outputs.forEach(output => output.send([0xFC]))
  playing = false
}

function tempo() {
  return (bpm * 4) / 24
}

function part(id) {
  var audio = document.querySelector('[data-socket="'+ id +'"]')
  var parentDiv = audio.parentElement

  audio.parentElement.parentElement.removeChild(parentDiv)
}

async function join(id, count, clients, currentlyPlaying) {
  playing = currentlyPlaying

  clients.forEach(function(socketListId) {
    if (!connections[socketListId]){
      connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
      //Wait for their ice candidate
      connections[socketListId].onicecandidate = function(){
        if (event.candidate !== null) {
          socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}))
        }
      }

      //Wait for their audio stream
      connections[socketListId].onaddstream = function(){
        gotRemoteStream(event, socketListId)
      }

      //Add the local audio stream
      connections[socketListId].addStream(localStream)
    }
  })

  // Create an offer to connect with your local description
  if (count >= 2) {
    const description = await connections[id].createOffer()

    await connections[id].setLocalDescription(description)

    const message = JSON.stringify({'sdp': connections[id].localDescription})

    socket.emit('signal', id, message)
  }

  // Send the MIDI Start signal locally if already playing
  if (playing) {
    start()
  }
}

/**
 * Fired when a socket channel is connected to
 */
function connect() {
  socketId = socket.id

  socket.on('part', part)
  socket.on('bpm', updateBPM)
  socket.on('start', start)
  socket.on('stop', stop)
  socket.on('join', join)
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
    alert('Your browser does not support getUserMedia API')
  }

  if (navigator.requestMIDIAccess) {
    midi = await navigator.requestMIDIAccess({ sysex: true })
  } else {
    alert('Your browser does not support the Web MIDI API')
  }

  socket = io.connect(location.href, { secure: true })

  socket.on('signal', signal)
  socket.on('connect', connect)
  input.addEventListener("change", changeBPM)
  buttons.forEach(button => button.addEventListener("click", buttonClick))
}

function gotRemoteStream(event, id) {
  const audio = document.createElement('audio')
  const track = document.createElement('div')
  const mixer = document.querySelector('.mixer')

  audio.setAttribute('data-socket', id)
  audio.srcObject   = event.stream
  audio.autoplay    = true
  audio.controls    = true

  track.classList.add("mixer__track")
  track.innerText = id
  track.appendChild(audio)
  mixer.appendChild(track)
}

async function signal(fromId, message) {
  // Parse the incoming signal
  var { sdp, ice } = JSON.parse(message)

  // Make sure it's not coming from yourself
  if (fromId !== socketId) {
    if (sdp) {
      const remoteDesc = new RTCSessionDescription(sdp)

      await connections[fromId].setRemoteDescription(remoteDesc)

      if (signal.sdp.type === 'offer') {
        const description = await connections[fromId].createAnswer()

        await connections[fromId].setLocalDescription(description)

        const message = JSON.stringify({
          'sdp': connections[fromId].localDescription
        })

        socket.emit('signal', fromId, message)
      }
    }

    if (ice) {
      const candidate = new RTCIceCandidate(ice)

      connections[fromId].addIceCandidate(candidate)
    }
  }
}

document.addEventListener("DOMContentLoaded", pageReady)
