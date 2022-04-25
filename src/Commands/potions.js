const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('potions')
        .setDescription('Check your ammount of Potions!'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            let hpPotions = 0;
            let mpPotions = 0;
            let inventoryData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name in (?, ?)", [userInfo.user_id, "HP_Potion_lvl_1", "MP_Potion_lvl_1"]);
            for (let i = 0; i < inventoryData.length; i++) {
                if (inventoryData[i].item_name == "HP_Potion_lvl_1") {
                    hpPotions += inventoryData[i].quantity;
                } else if (inventoryData[i].item_name == "MP_Potion_lvl_1") {
                    mpPotions += inventoryData[i].quantity;
                }
            }

            var embed = interaction.client.bluePagesImageEmbed(interaction.client.getWordLanguage(serverSettings.lang, "INVENTORY_POTIONS").format(hpPotions, mpPotions), interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY_POTIONS_TITLE').format(interaction.user.username), interaction.user, "", "https://obelisk.club/npc/potions.gif");
            await interaction.reply({ embeds: [embed] });
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