const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('Auction command!')
        .addSubcommand(subCommand => subCommand
            .setName('view')
            .setDescription('View auction!'))
        .addSubcommand(subCommand => subCommand
            .setName('add')
            .setDescription('Add item/skin to auction!')
            .addStringOption(option => option
                .setName('auction_type')
                .setDescription('Type of auction!')
                .addChoice("bidding", "bidding")
                .addChoice("buyout", "buyout")
                .setRequired(true))
            .addStringOption(option => option
                .setName('item_type')
                .setDescription('Auction type!')
                .addChoice("skin", "skin")
                .addChoice("item", "item")
                .addChoice("equipment", "equipment")
                .setRequired(true))
            .addStringOption(option => option
                .setName('id')
                .setDescription('Enter item/skin/equipment id!')
                .setRequired(true))
            .addStringOption(option => option
                .setName("price")
                .setDescription("Enter price! (Total)")
                .setRequired(true))
            .addStringOption(option => option
                .setName('quantity')
                .setDescription('Enter quantity!')))
        .addSubcommand(subCommand => subCommand
            .setName('remove')
            .setDescription('Remove item/equipemt/skin from auction!')
            .addStringOption(option => option
                .setName('auction_id')
                .setDescription('Enter auction id!')
                .setRequired(true)))
        .addSubcommand(subCommand => subCommand
            .setName('bid')
            .setDescription('Bid on an auction!')
            .addStringOption(option => option
                .setName('auction_id')
                .setDescription('Enter auction id!')
                .setRequired(true))
            .addStringOption(option => option
                .setName('bid_amount')
                .setDescription('Enter bid amount!')))
        .addSubcommand(subCommand => subCommand
            .setName('buyout')
            .setDescription('Buyout an auction!')
            .addStringOption(option => option
                .setName('auction_id')
                .setDescription('Enter auction id!')
                .setRequired(true))
            .addStringOption(option => option
                .setName('buyout_amount')
                .setDescription('Enter buyout amount!')))
        .addSubcommand(subCommand => subCommand
            .setName('offers')
            .setDescription('View offers on an auction!')
            .addStringOption(option => option
                .setName('auction_id')
                .setDescription('Enter auction id!')))
        .addSubcommand(subCommand => subCommand
            .setName('accept')
            .setDescription('Accept an offer!')
            .addStringOption(option => option
                .setName('offer_id')
                .setDescription('Enter offer id!')
                .setRequired(true))),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
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

            async function generateUniquCode() {
                // check code in db
                let code = generateRandomString(5)
                let checkCode = await interaction.client.databaseSelectData("SELECT * FROM new_auction WHERE code = ?", [code]);
                while (checkCode[0] != undefined) {
                    code = generateRandomString(5);
                    checkCode = await interaction.client.databaseSelectData("SELECT * FROM new_auction WHERE code = ?", [code]);
                }
                return code;
            }

            // generate n number of characters
            function generateRandomString(length) {
                var text = "";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

                for (var i = 0; i < length; i++)
                    text += possible.charAt(Math.floor(Math.random() * possible.length));

                return text;
            }

            const auctionChannelID = "968938204298379264";

            if (interaction.options.getSubcommand() === "view") {
                let activeAuction = await interaction.client.databaseSelectData("SELECT * FROM new_auction");
                if (activeAuction[0] === undefined) {
                    return await interaction.editReply({ embeds: interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "AUCTION_EMPTY"), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR')) })
                }
            } else if (interaction.options.getSubcommand() === "add") {

                var quantity = interaction.options.getString("quantity");
                var price = interaction.options.getString("price");
                let date = new Date();


                if (quantity == null) {
                    quantity = 1;
                } else {
                    quantity = nFormatterStringToNumber(quantity);
                    if (quantity == "error" || quantity < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_QUANTITY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                }

                if (price == null) {
                    price = 1;
                } else {
                    price = nFormatterStringToNumber(price);
                    if (price == "error" || price < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_PRICE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                }

                if (interaction.options.getString("item_type") === "item") {
                    // check quantity in inventory
                    let itemInfo = await interaction.client.databaseSelectData("select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and (items.id like ?) or (user_inventory.item_name like ?) and user_inventory.item_name != 'Aurora' order by id ASC LIMIT 1", [interaction.user.id, interaction.options.getString("id"), interaction.options.getString("id")]);
                    if (itemInfo[0] === undefined) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF_INV'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                    if (itemInfo[0].quantity < quantity) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF_INV_QUANTITY').format(quantity, itemInfo[0].item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                    if (itemInfo[0].type != "material") {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_BLOCK'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                    await interaction.client.databaseEditData("UPDATE user_inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?", [quantity, interaction.user.id, itemInfo[0].item_name]);

                    // send message to auction channel
                    let code = await generateUniquCode();
                    date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${code}]`)
                        .addFields(
                            { name: "Price", value: price.toString(), inline: true },
                            { name: "Quantity", value: quantity.toString(), inline: true },
                            { name: "Item", value: itemInfo[0].item_name.replaceAll("_", " ") + `\n` + itemInfo[0].desc, inline: true }
                        )
                        .setImage("https://obelisk.club/npc/auction.png")
                        .setTimestamp(date)
                        .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });

                    requestBody = {
                        channel_id: auctionChannelID,
                        message: [{
                            tts: false,
                            embeds: [
                                embed]
                        }]
                    }

                    var dmMessage = await fetch(`https://api.obelisk.club/DMAPI/send_dm`, {
                        method: 'POST',
                        headers: {
                            'x-api-key': process.env.API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    })
                        .then(response => response.json())
                        .then(data => { return data });


                    // add data to new_auction table
                    await interaction.client.databaseEditData("INSERT INTO `new_auction`(`code`, `auction_type`, `message_id`, `item`, `type`, `owner_id`, `value`, `offered_value`, `quantity`) VALUES (?,?,?,?,?,?,?,?,?)",
                        [code, interaction.options.getString("auction_type"), dmMessage.Message[0].id, itemInfo[0].item_name, interaction.options.getString("item_type"), interaction.user.id, price, price, quantity]);

                } else if (interaction.options.getString("item_type") === "equipment") {

                } else if (interaction.options.getString("item_type") === "skin") {

                }



                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_ADDED_SUCCESSFULLY').format("ssd"), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });

            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}