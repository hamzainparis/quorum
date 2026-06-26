export class RoomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomError';
  }
}

export class RoomNotFoundError extends RoomError {
  constructor(roomCode: string) {
    super(`Room "${roomCode}" was not found`);
    this.name = 'RoomNotFoundError';
  }
}

export class NotFacilitatorError extends RoomError {
  constructor() {
    super('Only the facilitator can do that');
    this.name = 'NotFacilitatorError';
  }
}

export class PlayerNotFoundError extends RoomError {
  constructor() {
    super('Player is not in this room');
    this.name = 'PlayerNotFoundError';
  }
}
