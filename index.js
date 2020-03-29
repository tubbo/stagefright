const express = require("express")
const http = require("http")
const socketio = require("socket.io")
const webpack = require("webpack")
const webpackDevMiddleware = require("webpack-dev-middleware")
const webpackHotMiddleware = require("webpack-hot-middleware")
const config = require("./webpack.config.js")
const compiler = webpack(config)

const app = express()
const server = http.Server(app)
const io = socketio(server)
const index = (req, res) => {
    res.sendFile(__dirname + "/index.html")
}
const connect = socket => {
    const count = io.engine.clientsCount
    const clients = Object.keys(io.sockets.clients().sockets)

    io.emit("join", socket.id, count, clients)

    socket.on("signal", (id, message) => {
        socket.to(id).emit("signal", socket.id, message)
    })
    socket.on("message", data => socket.emit("broadcast", socket.id, data))
    socket.on("part", () => socket.emit("part", socket.id))
}

app.get('/', index)
app.use(express.static(__dirname + '/public'))

if (process.env.NODE_ENV === "production") {
  app.use(express.static(__dirname + '/dist'))
} else {
  app.use(webpackDevMiddleware(compiler))
  app.use(webpackHotMiddleware(compiler))
}

io.on('connection', connect)
server.listen(1337)
