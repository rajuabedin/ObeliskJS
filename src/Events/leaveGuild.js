const Event = require('../Structures/Event.js');

module.exports = new Event("guildDelete", async (client,guild) => {
    await client.databaseEditData(`delete from server_settings where server_id = '${guild.id}'`)
});