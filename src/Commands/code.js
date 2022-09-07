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
        .setName('code')
        .setDescription('Redeem you gift!')
        .addStringOption(option => option
            .setName('code')
            .setDescription('Code to redeem')
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
            let code = interaction.options.getString('code');
            let codeInfo = await interaction.client.databaseSelectData("select * from gift_codes where code = ?", [code]);
            if (codeInfo.length == 0) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_NOT_FOUND'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                return;
            }
            codeInfo = codeInfo[0];

            // delete from gift_codes if onetime code
            if (codeInfo.onetime == 1) {
                await interaction.client.databaseEditData("delete from gift_codes where code = ?", [code]);
            }

            // check if user already redeemed the code
            let userCodeInfo = await interaction.client.databaseSelectData("select * from users_code where user_id = ? and code_id = ?", [interaction.user.id, codeInfo.id]);
            if (userCodeInfo.length > 0) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_ALREADY_REDEEMED'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                return;
            }

            // check if meet h_kills count
            if (codeInfo.h_kills_count > userInfo.h_kills) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_NOT_MEET_H_KILLS').format(codeInfo.h_kills_count), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                return;
            }

            // check if expired
            if (codeInfo.expire_date < Date.now()) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_EXPIRED'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                return;
            }

            // check if on codeInfo.users list
            if (codeInfo.users != "Any") {
                let users = codeInfo.users.split(";");
                if (!users.includes(interaction.user.id)) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_NOT_FOUND'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    return;
                }
            }

            // check if has donator rank
            if (codeInfo.donator_ranks !== "0") {
                let userDRank = await getUserInfoDonator(interaction.user.id);
                let dRanks = codeInfo.donator_ranks.split(";");
                if (!dRanks.includes(userDRank)) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_NOT_FOUND'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    return;
                }
            }
            let reward = "";
            // add to users_code
            await interaction.client.databaseEditData(`insert into users_code (user_id, code_id) values (?, ?)`, [interaction.user.id, codeInfo.id]);
            // redeem items
            if (codeInfo.type == "item") {
                let items = codeInfo.gift.split(";");
                let currentItem = [];
                for (let i = 0; i < items.length; i++) {
                    currentItem = items[i].split("-");
                    await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, currentItem[0], currentItem[1], currentItem[1]])
                    reward += `${currentItem[1]}x ${currentItem[0].replaceAll('_', ' ')} `;
                }
            } else if (codeInfo.type == "gold") {
                await interaction.client.databaseEditData(`update users set gold = gold + ? where user_id = ?`, [codeInfo.gold, interaction.user.id]);
                reward += `${codeInfo.gold} gold `;
            } else if (codeInfo.type == "skin") {
                let skins = codeInfo.gift.split(";");
                let currentSkin = [];
                for (let i = 0; i < skins.length; i++) {
                    currentSkin = skins[i].split("-");
                    await interaction.client.databaseEditData(`insert into user_skins (user_id, skin_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, currentSkin[0], currentSkin[1], currentSkin[1]])
                    reward += `${currentSkin[1]}x ${currentSkin[0]} `;
                }
            } else if (codeInfo.type == "border") {
                let borders = codeInfo.gift.split(";");
                let currentBorder = [];
                for (let i = 0; i < borders.length; i++) {
                    currentBorder = borders[i].split("-");
                    await interaction.client.databaseEditData(`insert into user_borders (user_id, border_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, currentBorder[0], currentBorder[1], currentBorder[1]])
                    reward += `${currentBorder[1]}x ${currentBorder[0]} `;
                }
            } else {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_NOT_FOUND'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                return;
            }

            // send message
            await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CODE_REDEEMED').format(reward), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], ephemeral: true });

        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

async function getUserInfoDonator(userId) {
    requestBody = {
        user_id: userId
    }

    var data = await fetch(`https://api.obelisk.club/DMAPI/get_user`, {
        method: 'POST',
        headers: {
            'x-api-key': process.env.API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => response.json())
        .then(data => { return data });
    if (data.success === true) {
        if (data.Data[0].roles.includes("800399000141430796")) {
            return 4;
        } else if (data.Data[0].roles.includes("772832085231665194")) {
            return 3;
        } else if (data.Data[0].roles.includes("772832009851895810")) {
            return 2;
        } else if (data.Data[0].roles.includes("760205852585099275")) {
            return 1;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}


async function getUserRoles(userId) {
    requestBody = {
        user_id: userId
    }

    var data = await fetch(`https://api.obelisk.club/DMAPI/get_user`, {
        method: 'POST',
        headers: {
            'x-api-key': process.env.API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => response.json())
        .then(data => { return data });
    if (data.success === true) {
        if (data.Data[0].roles.includes("800399000141430796")) {
            return 4;
        } else if (data.Data[0].roles.includes("772832085231665194")) {
            return 3;
        } else if (data.Data[0].roles.includes("772832009851895810")) {
            return 2;
        } else if (data.Data[0].roles.includes("760205852585099275")) {
            return 1;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}