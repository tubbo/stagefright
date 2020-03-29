import io from "socket.io-client"

var localAudio;
var socketId;
var localStream;
var connections = {};
var socket;
var midi;
var playing;
var bpm;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

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
  return 60 / bpm / 24
}

function pageReady() {
    localAudio = document.querySelector(".mixer__track--local audio")

    var constraints = {
        video: false,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){

                socket = io.connect(location.href, {secure: true});
                socket.on('signal', gotMessageFromServer);

                socket.on('connect', function(){

                    socketId = socket.id;

                    socket.on('part', function(id){
                        var audio = document.querySelector('[data-socket="'+ id +'"]');
                        var parentDiv = audio.parentElement;
                        audio.parentElement.parentElement.removeChild(parentDiv);
                    });

                    socket.on('bpm', updateBPM)
                    socket.on('start', start)
                    socket.on('stop', stop)

                    socket.on('join', function(id, count, clients, cp){
                        playing = cp
                        clients.forEach(function(socketListId) {
                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate
                                connections[socketListId].onicecandidate = function(){
                                    if(event.candidate != null) {
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                //Wait for their audio stream
                                connections[socketListId].onaddstream = function(){
                                    gotRemoteStream(event, socketListId)
                                }

                                //Add the local audio stream
                                connections[socketListId].addStream(localStream);
                            }
                        });

                        //Create an offer to connect with your local description

                        if(count >= 2) {
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                })
                            });
                        }

                      console.log('playing', playing)

                        if (playing) {
                          start()
                        }
                    });
                })

                document.getElementById("bpm").addEventListener("change", changeBPM)
              document.getElementById("start").addEventListener("click", () => socket.emit("start"))
              document.getElementById("stop").addEventListener("click", () => socket.emit("stop"))
            });
    } else {
        alert('Your browser does not support getUserMedia API');
    }

    const sysex = true
    navigator.requestMIDIAccess({ sysex }).then(m => midi = m)
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localAudio.srcObject = localStream;
}

function gotRemoteStream(event, id) {
    const audio = document.createElement('audio')
    const track = document.createElement('div')
    const mixer = document.querySelector('.mixer')

    audio.setAttribute('data-socket', id);
    audio.srcObject   = event.stream;
    audio.autoplay    = true;
    audio.controls    = true;

    track.classList.add("mixer__track");
    track.innerText = id;
    track.appendChild(audio);
    mixer.appendChild(track);
}

function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if (fromId != socketId) {
        if (signal.sdp){
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        connections[fromId].setLocalDescription(description).then(function() {
                            socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        })
                    })
                }
            })
        }

        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
        }
    }
}

document.addEventListener("DOMContentLoaded", pageReady);
