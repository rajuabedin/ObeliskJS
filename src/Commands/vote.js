const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const utility = require('../Utility/utils');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote to get rewards!'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            let embed = new MessageEmbed()
                .setTitle(interaction.client.getWordLanguage(serverSettings.lang, 'VOTE_TITLE'))
                .setDescription(interaction.client.getWordLanguage(serverSettings.lang, 'VOTE').format("30x Aurora Fragment", "1x Loot Box Tier II", "https://top.gg/bot/735090182893862954/vote", "https://top.gg/servers/749698569304277155/vote"))
                .setFooter({
                    text: interaction.client.getWordLanguage(serverSettings.lang, 'VOTE_FOOTER'),
                })
                .setThumbnail(interaction.client.user.avatarURL())
                .setColor(interaction.client.colors.green);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}