import express from "express"
import http from "http"
import socketio from "socket.io"
import webpack from "webpack"
import webpackDevMiddleware from "webpack-dev-middleware"
import webpackHotMiddleware from "webpack-hot-middleware"
import config from "./webpack.config.js"
import httpsRedirect from "express-https-redirect"
import fs from "fs"

const __dirname = fs.realpathSync('.')
const compiler = webpack(config)
const app = express()
const server = http.Server(app)
const io = socketio(server)
const index = (req, res) => {
  res.sendFile(__dirname + "/index.html")
}
let bpm = 120
let playing = false
const connect = socket => {
  const count = io.engine.clientsCount
  const clients = Object.keys(io.sockets.clients().sockets)

  io.emit("join", socket.id, count, clients, playing)
  io.emit("bpm", bpm)

  socket.on("signal", (id, message) => {
    socket.to(id).emit("signal", socket.id, message)
  })
  socket.on("message", data => socket.emit("broadcast", socket.id, data))
  socket.on("disconnect", () => socket.emit("part", socket.id))
  socket.on("bpm", newBPM => {
    bpm = newBPM
    socket.emit("bpm", bpm)
  })
  socket.on("start", () => {
    socket.emit("start")
    playing = true
  })
  socket.on("stop", () => {
    socket.emit("stop")
    playing = false
  })
}

app.use(express.static(__dirname + '/public'))

if (process.env.NODE_ENV === "production") {
  app.use(express.static(__dirname + '/dist'))
  app.use('/', httpsRedirect())
} else {
  app.use(webpackDevMiddleware(compiler))
  app.use(webpackHotMiddleware(compiler))
}


app.get('/', index)
io.on('connection', connect)
server.listen(process.env.PORT || 1337)
