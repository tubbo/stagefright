import NotFoundError from "./errors/not-found"

/**
 * Connect to local MIDI devices and send MTC signals at a given tempo.
 */
export default class Sequencer {
  constructor(midi) {
    this.midi = midi
    this.beatsPerMinute = 0
    this.startButton = document.getElementById("start")
    this.stopButton = document.getElementById("stop")
    this.beatDisplay = document.getElementById("beat")
    this.tick = 0
    this.quarter = 0
    this.timeout = null
  }

  /**
   * Send MIDI START signal.
   */
  start() {
    this.send([0xFA])
    this.send([0xF8])

    this.expected = Date.now() + this.tempo
    this.timeout = setTimeout(this.sync.bind(this), this.tempo)
    this.startButton.setAttribute("disabled", "disabled")
    this.stopButton.removeAttribute("disabled")
  }

  /**
   * Send MIDI CLOCK signal.
   */
  sync() {
    this.tick++

    if (this.tick % 24 === 0) {
      this.quarter++
      this.beatDisplay.innerText = this.quarter.toString()
    }

    this.send([0xF8])

    if (this.playing) {
      const dt = Date.now() - this.expected

      if (dt <= this.tempo) {
        this.expected += this.tempo
        const nextTime = Math.max(0, this.tempo - dt)
        this.timeout = setTimeout(this.sync.bind(this), nextTime)
      }
    }
  }

  /**
   * Send MIDI STOP signal.
   */
  stop() {
    this.send([0xFC])
    this.stopButton.setAttribute("disabled", "disabled")
    this.startButton.removeAttribute("disabled")
    this.beat = 0
    this.tick = 0

    clearTimeout(this.timeout)
  }

  /**
   * Send to all MIDI outputs
   */
  send(payload) {
    if (this.output) {
      this.output.send(payload)
    }
  }

  /**
   * The sequencer is running if a `timeout` is defined.
   */
  get playing() {
    return this.timeout !== null
  }

  /**
   * Interval to send sync signals to MIDI devices.
   */
  get tempo() {
    return 1000 * (60 / this.bpm / 24)
  }

  /**
   * Current device ID of the selected output.
   */
  get device() {
    if (!this.output) {
      return null
    }

    return this.output.id
  }

  /**
   * Select the output by setting its device ID. This will find an
   * output corresponding to the ID. If not found, an error will be
   * thrown`
   */
  set device(id) {
    let selected

    this.midi.outputs.forEach(output => {
      if (id === output.id) {
        selected = output
      }
    })

    if (!selected) {
      throw new NotFoundError(id)
    }

    this.output = selected
  }

  set bpm(value) {
    this.beatsPerMinute = value
    this.expected = Date.now() + this.tempo
  }

  get bpm() {
    return this.beatsPerMinute
  }
}
