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
        try {
            if (interaction.options.getString('confirmation') === 'yes') {
                await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_DEL_ACCOUNT_SUC"))], ephemeral: true });
                await interaction.client.databaseEditData('delete from users where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from bank where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from buff where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from user_settings where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from user_skins where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from user_borders where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from users_pet where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from created_eqp where user_id = ?', [interaction.user.id]);
                await interaction.client.databaseEditData('delete from user_cd where user_id = ?', [interaction.user.id]);
            } else {
                await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'COMMAND_DEL_ACCOUNT_WRONG_INPUT'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            }
        } catch (error) {
            if (interaction.replied) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            }
            errorLog.error(error.message, { 'command_name': interaction.commandName });
        }
    }
}