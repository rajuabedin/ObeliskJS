const Event = require('../Structures/Event.js');
const errorLog = require('../Utility/logger').logger;

module.exports = new Event("error", async (error) => {
    console.error(error);
    errorLog.error(error.message, { 'command_name': "discordjs" });
});