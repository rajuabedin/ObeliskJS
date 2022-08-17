const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('To check all currency balance'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            let bankBalance = 0;
            let bankInfo = await interaction.client.databaseSelectData("select * from bank where user_id = ?", [userInfo.user_id]);
            if (bankInfo[0] !== undefined) {
                bankBalance = bankInfo[0].value;
                bankInfo = bankInfo[0];
            }
            let auroraBalance = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, 'Aurora']);
            if (auroraBalance[0] == undefined) {
                auroraBalance = 0;
            } else {
                auroraBalance = auroraBalance[0].quantity;
            }

            let embed = new MessageEmbed()
                .setColor('0x009dff')
                .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BANK_ACC_BALANCE').format(interaction.user.username) })
                .setThumbnail(interaction.user.avatarURL())
                .setDescription(interaction.client.getWordLanguage(serverSettings.lang, 'BALANCE').format(auroraBalance, bankBalance, userInfo.level * 1000, userInfo.gold))
                .setTimestamp()

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}