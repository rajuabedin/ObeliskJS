const Event = require('../Structures/Event.js');
const Commands = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;

module.exports = new Event("interactionCreate", async (client, interaction) => {
    try {
        if (!interaction.isCommand()) return;

        let serverSettings = await interaction.client.databaseSelectData("select * from server_settings where server_id = ?", [interaction.guildId.toString()]);



        const allowedChannelsList = serverSettings[0].bot_selected_channel.split(';');
        const lockedChannelsList = serverSettings[0].bot_blocked_channel.split(';');
        const reactionChannelsList = serverSettings[0].reaction_channels.split(';');


        if (lockedChannelsList.includes(interaction.channelId)) return await interaction.reply({ embeds: [interaction.client.redEmbed(`Server admins have locked this channel`)], ephemeral: true })
        if (allowedChannelsList[0] !== "all" && Object.entries(allowedChannelsList).length !== 0 && !allowedChannelsList.includes(interaction.channelId)) return await interaction.reply({ embeds: [interaction.client.redEmbed(`Server admins have locked this channel`)], ephemeral: true })



        let userInfo = await interaction.client.getUserAccount(interaction.user.id);

        if (userInfo === undefined) return await interaction.reply({ embeds: [interaction.client.redEmbed('No account found! Please create one using interaction `create`')], ephemeral: true })

        const command = client.commands.find(cmd => cmd.data.name == interaction.commandName);
        command.execute(interaction, userInfo);
    } catch (error) {
        errorLog.error(error.message, { 'command_name': interaction.commandName });
        if (interaction.replied) {
            await interaction.editReply({ embeds: [interaction.client.redEmbed("Please try again later.", "Error!!")], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [interaction.client.redEmbed("Please try again later.", "Error!!")], ephemeral: true });
        }
    }
});