/**
 * Thrown when a MIDI device can't be found by its given ID.
 */
export default class NotFoundError extends Error {
  constructor(id) {
    super(`Couldn't find MIDI device with ID "${id}"`)
  }
}
