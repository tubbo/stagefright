/**
 * Connect to local MIDI devices and send MTC signals at a given tempo.
 */
export default class Sequencer {
  constructor(midi) {
    this.midi = midi
    this.bpm = 0
    this.playing = false
  }

  /**
   * Send MIDI START signal.
   */
  start() {
    this.send([0xFA])
    this.send([0xF8])

    setTimeout(this.sync, this.tempo)
    this.playing = true
  }

  /**
   * Send MIDI CLOCK signal.
   */
  sync() {
    this.send([0xF8])

    if (this.playing) {
      setTimeout(this.sync, this.tempo)
    }
  }

  /**
   * Send MIDI STOP signal.
   */
  stop() {
    this.send([0xFC])
    this.playing = false
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
    return (this.bpm * 4) / 24
  }
}
