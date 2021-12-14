const Event = require('../Structures/Event.js');
const errorLog = require('../Utility/logger').logger;

module.exports = new Event("error", async (error) => {
    console.warn(error);
    errorLog.warn(error.message, { 'command_name': "discordjs" });
});