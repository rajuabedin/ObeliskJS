const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Use thid command to send gold or items to another player')
        .addUserOption(options => options
            .setName('player')
            .setDescription('The player you want to send the item/gold to')
            .setRequired(true))
        .addStringOption(option => option
            .setName('type')
            .setDescription('The type of item you want to send')
            .setRequired(true)
            .addChoice('gold', 'gold')
            .addChoice('item', 'item'))
        .addStringOption(option => option
            .setName('quantity')
            .setDescription('The amount of gold/item you want to send')
            .setRequired(true))
        .addIntegerOption(options => options
            .setName('id')
            .setDescription('The id of the item you want to send (Required if you are sending items)')),


    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
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

            let quantity = interaction.options.getString('quantity');

            // validate quantity
            quantity = nFormatterStringToNumber(quantity);
            if (quantity == "error" || quantity < 1) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_QUANTITY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            // check if sending to self
            if (interaction.options.getUser('player').id === interaction.user.id) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_MONKEY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
            }

            if (interaction.options.getString('type') == 'gold') {
                if (userInfo.gold < quantity) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_MISSING').format(quantity), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }
                var secondUserData = await interaction.client.databaseSelectData("select * from users where user_id = ?", [interaction.options.getUser('player').id]);
                if (secondUserData[0] === undefined) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'NO_ACCOUNT').format(`<@!${interaction.options.getUser('player').id}>`), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }


                // confirm want to send
                let continueCode = false;
                await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SEND_GOLD_QUESTION').format(quantity, `<@!${interaction.options.getUser('player').id}>`), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })
                let collectorFilter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
                collector = interaction.channel.createMessageComponentCollector({ collectorFilter, time: 15000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                await interaction.client.databaseEditData("update users set gold = gold - ? where user_id = ?", [quantity, interaction.user.id]);
                await interaction.client.databaseEditData("update users set gold = gold + ? where user_id = ?", [quantity, interaction.options.getUser('player').id]);
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_SENT_SUC').format(quantity, `<@!${interaction.options.getUser('player').id}>`), interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_SENT'))], components: [] })

                // send dm to user
                let requestBody = {
                    user_id: interaction.options.getUser('player').id
                }

                var dmChannel = await fetch(`http://localhost:5000/DMAPI/get_dm_channel`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)

                })
                    .then(response => response.json());

                if (dmChannel.success == true) {
                    requestBody = {
                        channel_id: dmChannel.channel_id,
                        message: [{
                            tts: false,
                            embeds: [{
                                title: "Gold Recieved",
                                description: interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_RECEIVED').format(interaction.user.id, quantity),
                                color: 0x14e188,
                                timestamp: new Date()
                            }]
                        }]
                    }

                    var dmMessage = await fetch(`http://localhost:5000/DMAPI/send_dm`, {
                        method: 'POST',
                        headers: {
                            'x-api-key': process.env.API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    })
                        .then(response => response.json())
                        .then(data => { return data });
                    //console.log(dmMessage)
                }
                await userDailyLogger(interaction, interaction.user, "send", `Sent [${quantity}] gold to [${interaction.options.getUser('player').username}][${interaction.options.getUser('player').id}]`);
            } else {
                // check if id was passed
                if (interaction.options.getInteger('id') == null) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_SEND_ID'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                let userItemInfo = await interaction.client.databaseSelectData("SELECT user_inventory.item_name, user_inventory.quantity, items.desc, items.id, items.type from user_inventory INNER join items on user_inventory.item_name = items.name where user_id = ? and items.id = ?", [interaction.user.id, interaction.options.getInteger('id')]);
                if (userItemInfo[0] === undefined) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF_INV'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }

                userItemInfo = userItemInfo[0];

                // check if user has enough quantity
                if (userItemInfo.quantity < quantity) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF_INV_QUANTITY').format(quantity, userItemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }

                // check if its a tradable item
                if (userItemInfo.type == "item") {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_TRADE').format(quantity, userItemInfo.item_name), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }

                // confirm want to send
                let continueCode = false;
                await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SEND_ITEM_QUESTION').format(quantity, userItemInfo.item_name.replaceAll("_", " "), `<@!${interaction.options.getUser('player').id}>`), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })
                collectorFilter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
                collector = interaction.channel.createMessageComponentCollector({ collectorFilter, time: 15000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                // deduct item quantity from main user
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [quantity, interaction.user.id, userItemInfo.item_name]);
                // send item to second user
                await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.options.getUser('player').id, userItemInfo.item_name, quantity, quantity]);

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ITEM_SENT_SUC').format(quantity, userItemInfo.item_name, `<@!${interaction.options.getUser('player').id}>`), interaction.client.getWordLanguage(serverSettings.lang, 'GOLD_SENT'))], components: [] })

                // send dm to user
                let requestBody = {
                    user_id: interaction.options.getUser('player').id
                }

                var dmChannel = await fetch(`http://localhost:5000/DMAPI/get_dm_channel`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)

                })
                    .then(response => response.json());

                if (dmChannel.success == true) {
                    requestBody = {
                        channel_id: dmChannel.channel_id,
                        message: [{
                            tts: false,
                            embeds: [{
                                title: "Gold Recieved",
                                description: interaction.client.getWordLanguage(serverSettings.lang, 'ITEM_RECEIVED').format(interaction.user.id, quantity, userItemInfo.item_name.replaceAll("_", " ")),
                                color: 0x14e188,
                                timestamp: new Date()
                            }]
                        }]
                    }

                    var dmMessage = await fetch(`http://localhost:5000/DMAPI/send_dm`, {
                        method: 'POST',
                        headers: {
                            'x-api-key': process.env.API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    })
                        .then(response => response.json())
                        .then(data => { return data });
                    //console.log(dmMessage)
                }
                await userDailyLogger(interaction, interaction.user, "send", `Sent [${quantity}x ${userItemInfo.item_name}] to [${interaction.options.getUser('player').username}][${interaction.options.getUser('player').id}]`);
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

const rowYesNo = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('yes')
            .setLabel('YES')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('NO')
            .setStyle('DANGER'),
    );