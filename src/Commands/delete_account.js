const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Use this command to delete your player account')
        .addStringOption(option => option
            .setName('confirmation')
            .setDescription('Type `yes` to confirm deletion')
            .setRequired(true)),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            if (interaction.options.getString('confirmation') === 'yes') {
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_DEL_ACCOUNT_SUC"))], ephemeral: true });
                await interaction.client.databaseEditData('delete from users where user_id = ?', [interaction.user.id]);
            } else {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'COMMAND_DEL_ACCOUNT_WRONG_INPUT'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}