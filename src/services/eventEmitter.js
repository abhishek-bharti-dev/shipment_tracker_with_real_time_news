const EventEmitter = require('events');

class EventEmitterService extends EventEmitter {
    constructor() {
        super();
    }
}

module.exports = new EventEmitterService(); 