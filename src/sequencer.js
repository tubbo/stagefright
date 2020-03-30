/**
 * Connect to local MIDI devices and send MTC signals at a given tempo.
 */
export default class Sequencer {
  constructor(midi) {
    this.midi = midi
    this.bpm = 0
    this.playing = false
    this.startButton = document.getElementById("start")
    this.stopButton = document.getElementById("stop")
    this.beatDisplay = document.getElementById("beat")
    this.tick = 0
    this.quarter = 0
  }

  /**
   * Send MIDI START signal.
   */
  start() {
    this.send([0xFA])
    this.send([0xF8])

    setTimeout(this.sync.bind(this), this.tempo)
    this.playing = true
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
      setTimeout(this.sync.bind(this), this.tempo)
    }
  }

  /**
   * Send MIDI STOP signal.
   */
  stop() {
    this.send([0xFC])
    this.playing = false
    this.stopButton.setAttribute("disabled", "disabled")
    this.startButton.removeAttribute("disabled")
    this.beat = 0
    this.tick = 0
  }

  /**
   * Send to all MIDI outputs
   */
  send(payload) {
    this.midi.outputs.forEach(output => output.send(payload))
  }

  /**
   * Interval to send sync signals to MIDI devices.
   */
  get tempo() {
    return 1000 * (60 / this.bpm / 24)
  }
}
