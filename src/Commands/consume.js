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
            .addChoices(
                { name: 'hp', value: 'hp' },
                { name: 'mp', value: 'mp' },
                { name: 'both', value: 'both' }
            ))
        .addStringOption(option => option
            .setName('amount')
            .setDescription('Amount of potions to consume.')),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        function nFormatterNumberToString(num, digits) {
            var si = [
                { value: 1, symbol: "" },
                { value: 1E3, symbol: "k" },
                { value: 1E6, symbol: "M" },
                { value: 1E9, symbol: "G" },
                { value: 1E12, symbol: "T" },
                { value: 1E15, symbol: "P" },
                { value: 1E18, symbol: "E" }
            ];
            var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length - 1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
            return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
        }

        function isNumeric(num) {
            return !isNaN(num)
        }

        function nFormatterStringToNumber(val) {
            if (isNumeric(val)) {
                return parseInt(val);
            }

            multiplier = val.substr(-1).toLowerCase();
            if (multiplier == "k")
                return parseFloat(val) * 1000;
            else if (multiplier == "m")
                return parseFloat(val) * 1000000;
            else if (multiplier == "b")
                return parseFloat(val) * 100000000;
            else
                return "error"
        }
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            let amount = interaction.options.getString('amount');
            if (amount === null) {
                amount = "full";
            } else {
                amount = nFormatterStringToNumber(amount);
                if (amount == "error" || amount < 1) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_AMOUNT'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
            }

            let inventoryData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name in (?, ?)", [userInfo.user_id, "HP_Potion_lvl_1", "MP_Potion_lvl_1"]);

            if (interaction.options.getString('type') == "hp") {
                let hpPotions = 0;
                for (let i = 0; i < inventoryData.length; i++) {
                    if (inventoryData[i].item_name == "HP_Potion_lvl_1") {
                        hpPotions += inventoryData[i].quantity;
                    }
                }

                let requiredPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredPotions = Math.ceil((userInfo.hp - userInfo.current_hp) / 30);
                    if (requiredPotions < 1) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_HEALED"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    if (hpPotions < amount) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("HP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
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
                    return interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_HP").format(requiredPotions, hpPotions - requiredPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_HP"), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                }
            } else if (interaction.options.getString('type') == "mp") {
                let mpPotions = 0;
                for (let i = 0; i < inventoryData.length; i++) {
                    if (inventoryData[i].item_name == "MP_Potion_lvl_1") {
                        mpPotions += inventoryData[i].quantity;
                    }
                }
                let requiredPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredPotions = Math.ceil((userInfo.mp - userInfo.current_mp) / 15);
                    if (requiredPotions < 1) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    if (mpPotions < amount) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
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
                    return interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_MP").format(requiredPotions, mpPotions - requiredPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_MP"), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
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
                let requiredHPPotions = 0;
                let requiredMPPotions = 0;
                let fullyHealed = false;
                if (amount == "full") {
                    requiredHPPotions = Math.ceil((userInfo.hp - userInfo.current_hp) / 30);
                    requiredMPPotions = Math.ceil((userInfo.mp - userInfo.current_mp) / 15);
                    if (requiredHPPotions < 1) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_HEALED"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                    if (requiredMPPotions < 1) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FULLY_MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                } else {
                    if (hpPotions < amount) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("HP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
                    if (mpPotions < amount) {
                        return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_POTIONS_NOT_ENOUGH").format("MP"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                    }
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
                    return interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FULLY_HEALED_HP_MP").format(requiredHPPotions, requiredMPPotions, hpPotions - requiredHPPotions, mpPotions - requiredMPPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                } else {
                    return interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "PARTIALLY_HEALED_HP_MP").format(requiredHPPotions, requiredMPPotions, hpPotions - requiredHPPotions, mpPotions - requiredMPPotions), interaction.client.getWordLanguage(serverSettings.lang, "SUCCESS"))] });
                }
            }

        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}