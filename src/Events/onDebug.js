const Event = require('../Structures/Event.js');

module.exports = new Event("error", async (error) => {
    console.info(error);
});