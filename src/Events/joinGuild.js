const Event = require('../Structures/Event.js');

module.exports = new Event("guildCreate", async (client, guild) => {
    await client.databaseEditData(`INSERT INTO server_settings (server_id, allowed_channels, locked_channels, edited_by, last_edit_date) VALUES ('${guild.id}', JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(), CURRENT_TIMESTAMP)`)
});