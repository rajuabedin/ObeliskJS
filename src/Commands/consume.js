const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('consume')
        .setDescription('Consume HP/MP/Both potions!')
        .addStringOption(option => option
            .setName('type')
            .setDescription('Type of potion to consume.')
            .setRequired(true)
            .addChoice('hp', 'hp')
            .addChoice('mp', 'mp')
            .addChoice('both', 'both'))
        .addNumberOption(option => option
            .setName('amount')
            .setDescription('Amount of potions to consume.')),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            let amount = interaction.options.getNumber('amount');
            if (amount === null) {
                amount = "full";
            }
            if (amount != "full" && amount < 1) {
                return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_TRADE_AMMOUNT"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
            }

            let inventoryData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name in (?, ?)", [userInfo.user_id, "HP_Potion_lvl_1", "MP_Potion_lvl_1"]);

            if (interaction.options.getString('type') == "hp") {
                let hpPotions = 0;
                for (let i = 0; i < inventoryData.length; i++) {
                    if (inventoryData[i].item_name == "HP_Potion_lvl_1") {
                        hpPotions += inventoryData[i].quantity;
                    }
                }
                if (hpPotions < amount) {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("HP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                let requiredPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredPotions = Math.ceil((userInfo.hp - userInfo.current_hp) / 30);
                    if (requiredPotions < 1) {
                        return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_HEALED"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    requiredPotions = amount;
                }
                if (requiredPotions > hpPotions) {
                    requiredPotions = hpPotions;
                }
                let newHP = 30 * requiredPotions + userInfo.current_hp;

                if (newHP > userInfo.hp) {
                    newHP = userInfo.hp;
                }

                if (newHP === userInfo.hp) {
                    fullyHealed = true;
                }

                await interaction.client.databaseEditData("update users set current_hp = ? where user_id = ?", [newHP, userInfo.user_id]);
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [requiredPotions, userInfo.user_id, "HP_Potion_lvl_1"]);
                await userDailyLogger(interaction, interaction.user, "consume", "Consumed " + requiredPotions + " HP Potions.");
                if (fullyHealed) {
                    return interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_HP").format(requiredPotions, hpPotions - requiredPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_HP"), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                }
            } else if (interaction.options.getString('type') == "mp") {
                let mpPotions = 0;
                for (let i = 0; i < inventoryData.length; i++) {
                    if (inventoryData[i].item_name == "MP_Potion_lvl_1") {
                        mpPotions += inventoryData[i].quantity;
                    }
                }
                if (mpPotions < amount) {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                let requiredPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredPotions = Math.ceil((userInfo.mp - userInfo.current_mp) / 15);
                    if (requiredPotions < 1) {
                        return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    requiredPotions = amount;
                }
                if (requiredPotions > mpPotions) {
                    requiredPotions = mpPotions;
                }
                let newMP = 15 * requiredPotions + userInfo.current_mp;

                if (newMP > userInfo.mp) {
                    newMP = userInfo.mp;
                }
                if (newMP === userInfo.mp) {
                    fullyHealed = true;
                }

                await interaction.client.databaseEditData("update users set current_mp = ? where user_id = ?", [newMP, userInfo.user_id]);
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [requiredPotions, userInfo.user_id, "MP_Potion_lvl_1"]);
                await userDailyLogger(interaction, interaction.user, "consume", "Consumed " + requiredPotions + " MP Potions.");
                if (fullyHealed) {
                    return interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_MP").format(requiredPotions, mpPotions - requiredPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_MP"), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                }

            } else if (interaction.options.getString('type') == "both") {
                let hpPotions = 0;
                let mpPotions = 0;
                for (let i = 0; i < inventoryData.length; i++) {
                    if (inventoryData[i].item_name == "HP_Potion_lvl_1") {
                        hpPotions += inventoryData[i].quantity;
                    } else if (inventoryData[i].item_name == "MP_Potion_lvl_1") {
                        mpPotions += inventoryData[i].quantity;
                    }
                }
                if (hpPotions < amount) {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("HP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                } else if (mpPotions < amount) {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                let requiredHPPotions = 0;
                let requiredMPPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredHPPotions = Math.ceil((userInfo.hp - userInfo.current_hp) / 30);
                    requiredMPPotions = Math.ceil((userInfo.mp - userInfo.current_mp) / 15);
                    if (requiredHPPotions < 1) {
                        return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_HEALED"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                    if (requiredMPPotions < 1) {
                        return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    requiredHPPotions = amount;
                    requiredMPPotions = amount;
                }

                if (requiredHPPotions > hpPotions) {
                    requiredHPPotions = hpPotions;
                }
                if (requiredMPPotions > mpPotions) {
                    requiredMPPotions = mpPotions;
                }

                let newHP = 30 * requiredHPPotions + userInfo.current_hp;
                let newMP = 15 * requiredMPPotions + userInfo.current_mp;

                if (newHP > userInfo.hp) {
                    newHP = userInfo.hp;
                }
                if (newMP > userInfo.mp) {
                    newMP = userInfo.mp;
                }

                if (newHP === userInfo.hp && newMP === userInfo.mp) {
                    fullyHealed = true;
                }

                await interaction.client.databaseEditData("update users set current_hp = ?, current_mp = ? where user_id = ?", [newHP, newMP, userInfo.user_id]);
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [requiredHPPotions, userInfo.user_id, "HP_Potion_lvl_1"]);
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [requiredMPPotions, userInfo.user_id, "MP_Potion_lvl_1"]);
                await userDailyLogger(interaction, interaction.user, "consume", "Consumed " + requiredHPPotions + " HP Potions and " + requiredMPPotions + " MP Potions.");
                if (fullyHealed) {
                    return interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_HP_MP").format(requiredHPPotions, requiredMPPotions, hpPotions - requiredHPPotions, mpPotions - requiredMPPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_HP_MP").format(requiredHPPotions, requiredMPPotions, hpPotions - requiredHPPotions, mpPotions - requiredMPPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                }
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