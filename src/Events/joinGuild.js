const Event = require('../Structures/Event.js');

module.exports = new Event("guildCreate", async (client, guild) => {
    await client.databaseEditData(`INSERT INTO server_settings (server_id, bot_selected_channel, bot_blocked_channel, edited_by, last_edit_date) VALUES ('${guild.id}', "all", "None", "none", CURRENT_TIMESTAMP)`)
});