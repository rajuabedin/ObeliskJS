const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
const utility = require('../Utility/utils');
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
                .addChoices(
                    { name: 'Bidding', value: 'bidding' },
                    { name: 'Buyout', value: 'buyout' }
                )
                .setRequired(true))
            .addStringOption(option => option
                .setName('item_type')
                .setDescription('Auction type!')
                .addChoices(
                    { name: 'Item', value: 'item' },
                    { name: 'Skin', value: 'skin' },
                    { name: "Equipment", value: "equipment" }
                )
                .setRequired(true))
            .addStringOption(option => option
                .setName('id')
                .setDescription('Enter item/skin/equipment id!')
                .setRequired(true))
            .addStringOption(option => option
                .setName("price")
                .setDescription("Enter price! (per item) ")
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
                .setDescription('Enter bid amount!')
                .setRequired(true)))
        .addSubcommand(subCommand => subCommand
            .setName('buyout')
            .setDescription('Buyout an auction!')
            .addStringOption(option => option
                .setName('auction_id')
                .setDescription('Enter auction id!')
                .setRequired(true))
            .addStringOption(option => option
                .setName('buyout_amount')
                .setDescription('Enter buyout amount!'))),

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

            const auctionChannelID = process.env.AUCTION_CHANNEL;

            if (interaction.options.getSubcommand() === "view") {
                let activeAuction = await interaction.client.databaseSelectData("SELECT * FROM new_auction");
                if (activeAuction[0] === undefined) {
                    return await interaction.editReply({ embeds: interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "AUCTION_EMPTY"), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR')) })
                }

                let maxItemPerPage = 2;
                var newItems = [];
                var stringData = ""

                for (var i = 0; i < activeAuction.length; i++) {
                    if (activeAuction[i].auction_type == "buyout") {
                        stringData += `\n**ID** [\`${activeAuction[i].code}\`]\n
                        **${utility.titleCase(activeAuction[i].type)}:** ${activeAuction[i].item.replaceAll("_", " ")}
                        **${interaction.client.getWordLanguage(serverSettings.lang, 'SELLING_QUANTITY')}:** ${activeAuction[i].quantity}]
                        **${interaction.client.getWordLanguage(serverSettings.lang, 'DESCRIPTION')}:** 
                        ${interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_SELLING').format(activeAuction[i].owner_id,
                            (activeAuction[i].quantity).toString() + "x " + activeAuction[i].item.replaceAll("_", " "), activeAuction[i].value * activeAuction[i].quantity, activeAuction[i].value)}\n`
                    } else if (activeAuction[i].auction_type == "bidding") {
                        if (activeAuction[i].buyer_id == null) {
                            activeAuction[i].buyer_id = activeAuction[i].owner_id
                        }
                        stringData += `\n**ID** [\`${activeAuction[i].code}\`]\n
                        **${utility.titleCase(activeAuction[i].type)}:** ${activeAuction[i].item.replaceAll("_", " ")}
                        **${interaction.client.getWordLanguage(serverSettings.lang, 'SELLING_QUANTITY')}:** ${activeAuction[i].quantity}]
                        **${interaction.client.getWordLanguage(serverSettings.lang, 'DESCRIPTION')}:** 
                        ${interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_BIDDING').format(activeAuction[i].owner_id,
                            (activeAuction[i].quantity).toString() + "x " + activeAuction[i].item.replaceAll("_", " "), activeAuction[i].buyer_id, activeAuction[i].offered_value * 2)}\n`
                    }
                    if (((i + 1) % maxItemPerPage) == 0 || i === activeAuction.length - 1) {
                        newItems.push(stringData);
                        stringData = ""
                    }
                }
                let maxPages = newItems.length;
                var embed = interaction.client.bluePagesEmbed(newItems[0], interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    utility.paginationHandler("AUCTION", userInfo, interaction, serverSettings, newItems, msg);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }

            } else if (interaction.options.getSubcommand() === "add") {

                var quantity = interaction.options.getString("quantity");
                var price = interaction.options.getString("price");
                let date = new Date();
                let code = "Not Added";


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
                    code = await utility.generateUniqueCode(interaction.client, "new_auction");


                    date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${code}] - ${utility.titleCase(interaction.options.getString("auction_type"))}`)
                        .addFields(
                            { name: "Price per unit", value: price.toString(), inline: true },
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

                    // check if error 
                    if (dmMessage.code) {
                        let errorID = await errorLog.custom(dmMessage, interaction);
                        await interaction.client.databaseEditData("UPDATE user_inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?", [quantity, interaction.user.id, itemInfo[0].item_name]);
                        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    }

                    // add data to new_auction table
                    await interaction.client.databaseEditData("INSERT INTO `new_auction`(`code`, `auction_type`, `message_id`, `item`, `type`, `owner_id`, `value`, `offered_value`, `quantity`) VALUES (?,?,?,?,?,?,?,?,?)",
                        [code, interaction.options.getString("auction_type"), dmMessage.Message[0].id, itemInfo[0].item_name, interaction.options.getString("item_type"), interaction.user.id, price, price, quantity]);
                } else if (interaction.options.getString("item_type") === "equipment") {
                    let equipmentCode = interaction.options.getString("id").toUpperCase();

                    if (quantity > 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_EQUIPMENT_QUANTITY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }

                    // check if equipped item
                    if (userInfo.eqp_armor.toUpperCase() == equipmentCode || userInfo.eqp_weapon.toUpperCase() == equipmentCode) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_EQUIPMENT_EQUIPPED'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }

                    // check user equipment 
                    let equipmentInfo = await interaction.client.databaseSelectData("select * from created_eqp where item_id = ? and user_id = ?", [equipmentCode, interaction.user.id]);
                    if (equipmentInfo[0] === undefined) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_EQUIPMENT_NF_INV'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    } else {
                        equipmentInfo = equipmentInfo[0];
                        // update equipment owner to bot
                        await interaction.client.databaseEditData("UPDATE created_eqp SET user_id = ? WHERE item_id = ?", [interaction.client.user.id, equipmentCode]);
                    }
                    // send message to auction channel
                    code = await utility.generateUniqueCode(interaction.client, "new_auction", "code");

                    date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${code}] - ${utility.titleCase(interaction.options.getString("auction_type"))}`)
                        .addFields(
                            { name: "Price per unit", value: price.toString(), inline: true },
                            { name: "Quantity", value: quantity.toString(), inline: true },
                            { name: "Equipment", value: `\`${equipmentInfo.item_id}\`<< ${equipmentInfo.name.replaceAll("_", " ")} >> [ ${equipmentInfo.rank} ]\nGems: [ ${equipmentInfo.current_gem} ]`, inline: false }
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

                    // check if error 
                    if (dmMessage.code) {
                        let errorID = await errorLog.custom(dmMessage, interaction);
                        await interaction.client.databaseEditData("UPDATE created_eqp SET user_id = ? WHERE item_id = ?", [interaction.user.id, equipmentCode]);
                        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    }
                    // add data to new_auction table
                    await interaction.client.databaseEditData("INSERT INTO `new_auction`(`code`, `auction_type`, `message_id`, `item`, `type`, `owner_id`, `value`, `offered_value`, `quantity`) VALUES (?,?,?,?,?,?,?,?,?)",
                        [code, interaction.options.getString("auction_type"), dmMessage.Message[0].id, equipmentInfo.code, interaction.options.getString("item_type"), interaction.user.id, price, price, quantity]);
                } else if (interaction.options.getString("item_type") === "skin") {
                    let skinID = interaction.options.getString("id").toUpperCase();
                    // check if user have skin
                    let skinInfo = await interaction.client.databaseSelectData("select user_skins.skin_name, user_skins.quantity, bg_info.tradable, bg_info.bg_format from user_skins inner join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name = ?", [interaction.user.id, skinID]);

                    if (skinInfo[0] === undefined) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_SKIN_NF_INV'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                    skinInfo = skinInfo[0];

                    // check if skin is tradable
                    if (skinInfo.tradable === "No") {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_SKIN_NOT_TRADABLE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }

                    // check if have enough quantity
                    if (skinInfo.quantity < quantity) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_SKIN_QUANTITY').format(quantity, skinID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }

                    await interaction.client.databaseEditData("UPDATE user_skins SET quantity = quantity - ? WHERE user_id = ? AND skin_name = ?", [quantity, interaction.user.id, skinID]);

                    // send message to auction channel
                    code = await utility.generateUniqueCode(interaction.client, "new_auction", "code");

                    date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${code}] - ${utility.titleCase(interaction.options.getString("auction_type"))}`)
                        .addFields(
                            { name: "Price per unit", value: price.toString(), inline: true },
                            { name: "Quantity", value: quantity.toString(), inline: true },
                            { name: "Skin", value: `Skin ID: ${skinID}\nType: [ ${skinInfo.bg_format.replaceAll('.', '')} ]\n[${interaction.client.getWordLanguage(serverSettings.lang, 'DEMO')}](https://obelisk.club/skins.html#atvImg__${skinInfo.id})`, inline: false }
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

                    // check if error 
                    if (dmMessage.code) {
                        let errorID = await errorLog.custom(dmMessage, interaction);
                        await interaction.client.databaseEditData("UPDATE user_skins SET quantity = quantity + ? WHERE user_id = ? AND skin_name = ?", [quantity, interaction.user.id, skinID]);
                        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    }
                    // add data to new_auction table
                    await interaction.client.databaseEditData("INSERT INTO `new_auction`(`code`, `auction_type`, `message_id`, `item`, `type`, `owner_id`, `value`, `offered_value`, `quantity`) VALUES (?,?,?,?,?,?,?,?,?)",
                        [code, interaction.options.getString("auction_type"), dmMessage.Message[0].id, skinID, interaction.options.getString("item_type"), interaction.user.id, price, price, quantity]);
                }

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_ADDED_SUCCESSFULLY').format(code), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });

            } else if (interaction.options.getSubcommand() === "remove") {
                let code = interaction.options.getString("auction_id").toUpperCase();
                let auctionInfo = await interaction.client.databaseSelectData("SELECT * FROM new_auction WHERE code = ?", [code]);
                if (auctionInfo[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                if (auctionInfo[0].owner_id != interaction.user.id) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                auctionInfo = auctionInfo[0];
                await interaction.client.databaseEditData("DELETE FROM new_auction WHERE code = ?", [code]);
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_REMOVED'), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });
                // add item back to user inventory
                if (auctionInfo.type === "item") {
                    await interaction.client.databaseEditData("UPDATE user_inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?", [auctionInfo.quantity, interaction.user.id, auctionInfo.item]);
                } else if (auctionInfo.type === "equipment") {
                    await interaction.client.databaseEditData("UPDATE created_eqp set user_id = ? where item_id = ?", [interaction.user.id, auctionInfo.item]);
                } else if (auctionInfo.type === "skin") {
                    await interaction.client.databaseEditData("UPDATE user_skins SET quantity = quantity + ? WHERE user_id = ? AND skin-name = ?", [auctionInfo.quantity, interaction.user.id, auctionInfo.item]);
                }

                if (auctionInfo.auction_type === "bidding") {
                    await interaction.client.databaseEditData("update users set gold = gold + ? where user_id = ?", [auctionInfo.offered_value * auctionInfo.quantity, auctionInfo.buyer_id]);
                }
            } else if (interaction.options.getSubcommand() === "bid") {
                let auctionID = interaction.options.getString("auction_id").toUpperCase();
                let auctionInfo = await interaction.client.databaseSelectData("SELECT * FROM new_auction WHERE code = ?", [auctionID]);
                if (auctionInfo[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                if (auctionInfo[0].auction_type != "bidding") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NOT_BIDDING'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                let biddingAmount = interaction.options.getString("bid_amount");
                let nextBidAmount = auctionInfo[0].offered_value * 2;
                biddingAmount = nFormatterStringToNumber(biddingAmount);
                if (biddingAmount == "error" || biddingAmount < 1) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BIDDING_VALUE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                if (biddingAmount < nextBidAmount) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BIDDING_VALUE_TOO_LOW').format(nextBidAmount), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                // check if user has enough gold
                if (userInfo.gold < biddingAmount) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NOT_ENOUGH_GOLD').format(biddingAmount), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                // subtract gold from user
                await interaction.client.databaseEditData("UPDATE users SET gold = gold - ? WHERE user_id = ?", [biddingAmount, interaction.user.id]);

                // add gold to old user
                await interaction.client.databaseEditData("UPDATE users SET gold = gold + ? WHERE user_id = ?", [auctionInfo[0].offered_value, auctionInfo[0].buyer_id]);

                // bidding added to auction
                await interaction.client.databaseEditData("UPDATE new_auction SET offered_value = ?, buyer_id = ? WHERE code = ?", [biddingAmount, interaction.user.id, auctionID]);

                let embed = "";

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BID_ADDED_SUCCESSFULLY').format(nextBidAmount, auctionID), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });

                let date = auctionInfo[0].created_time;
                date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                if (auctionInfo[0].type === "item") {
                    let itemInfo = await interaction.client.databaseSelectData("SELECT * FROM items WHERE name = ?", [auctionInfo[0].item]);
                    embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${auctionInfo[0].code}] - ${auctionInfo[0].type}`)
                        .addFields(
                            { name: "Price per unit", value: biddingAmount.toString(), inline: true },
                            { name: "Quantity", value: auctionInfo[0].quantity.toString(), inline: true },
                            { name: "Item", value: itemInfo[0].name.replaceAll("_", " ") + `\n` + itemInfo[0].desc, inline: true }
                        )
                        .setImage("https://obelisk.club/npc/auction.png")
                        .setTimestamp(date)
                        .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });
                }
                else if (auctionInfo[0].type === "equipment") {
                    let equipmentInfo = await interaction.client.databaseSelectData("SELECT * FROM created_eqp WHERE item_id = ?", [auctionInfo[0].item]);
                    equipmentInfo = equipmentInfo[0];
                    embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${auctionInfo[0].code}] - ${auctionInfo[0].type}`)
                        .addFields(
                            { name: "Price per unit", value: biddingAmount.toString(), inline: true },
                            { name: "Quantity", value: auctionInfo[0].quantity.toString(), inline: true },
                            { name: "Equipment", value: `\`${equipmentInfo.item_id}\`<< ${equipmentInfo.name.replaceAll("_", " ")} >> [ ${equipmentInfo.rank} ]\nGems: [ ${equipmentInfo.current_gem} ]`, inline: false }
                        )
                        .setImage("https://obelisk.club/npc/auction.png")
                        .setTimestamp(date)
                        .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });
                } else if (auctionInfo[0].type === "skin") {
                    let skinInfo = await interaction.client.databaseSelectData("SELECT * FROM bg_info WHERE file_name = ?", [auctionInfo[0].item]);
                    skinInfo = skinInfo[0];
                    embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(`Auction id [${auctionInfo[0].code}] - ${auctionInfo[0].type}`)
                        .addFields(
                            { name: "Price per unit", value: biddingAmount.toString(), inline: true },
                            { name: "Quantity", value: auctionInfo[0].quantity.toString(), inline: true },
                            { name: "Skin", value: `Skin ID: ${skinInfo.file_name}\nType: [ ${skinInfo.bg_format.replaceAll('.', '')} ]\n[${interaction.client.getWordLanguage(serverSettings.lang, 'DEMO')}](https://obelisk.club/skins.html#atvImg__${skinInfo.id})`, inline: false }
                        )
                        .setImage("https://obelisk.club/npc/auction.png")
                        .setTimestamp(date)
                        .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });
                }

                requestBody = {
                    tts: false,
                    embeds: [embed.toJSON()],
                }

                var dmMessage = await fetch(`https://discord.com/api/v9/channels/${auctionChannelID}/messages/${auctionInfo[0].message_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bot ${process.env.TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => response.json())
                    .then(data => { return data });
            } else if (interaction.options.getSubcommand() === "buyout") {
                let auctionID = interaction.options.getString("auction_id").toUpperCase();
                let auctionInfo = await interaction.client.databaseSelectData("SELECT * FROM new_auction WHERE code = ?", [auctionID]);
                if (auctionInfo[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                if (auctionInfo[0].auction_type != "buyout") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_AUCTION_NOT_BUYOUT'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }

                let buyoutAmount = interaction.options.getString("buyout_amount");


                if (buyoutAmount != null) {
                    buyoutAmount = nFormatterStringToNumber(buyoutAmount);
                    if (buyoutAmount == "error" || buyoutAmount < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BUYOUT_VALUE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                } else {
                    buyoutAmount = 1;
                }
                // check if higher than offered quantity
                if (buyoutAmount > auctionInfo[0].quantity) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BUYOUT_VALUE_TOO_HIGH').format(auctionInfo[0].quantity), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                // check if user has enough gold
                let originalRequiredGold = buyoutAmount * auctionInfo[0].value;
                let requiredGold = Math.ceil((buyoutAmount * auctionInfo[0].value) * 0.8);
                if (userInfo.gold < originalRequiredGold) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NOT_ENOUGH_GOLD').format(originalRequiredGold), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                // subtract gold from user
                await interaction.client.databaseEditData("UPDATE users SET gold = ? WHERE user_id = ?", [userInfo.gold - originalRequiredGold, interaction.user.id]);
                // add gold to buyer
                // check if can be added to back
                let sellerBankInfo = await interaction.client.databaseSelectData("select * from bank where user_id = ?", [auctionInfo[0].owner_id]);

                if (sellerBankInfo[0] === undefined) {
                    await interaction.client.databaseEditData("INSERT INTO bank (user_id) VALUES (?)", [auctionInfo[0].owner_id]);
                    sellerBankInfo = {
                        user_id: auctionInfo[0].owner_id,
                        value: 0,
                        history: []
                    }
                } else {
                    sellerBankInfo = sellerBankInfo[0];
                }
                let date = auctionInfo[0].created_time;
                date.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 2));
                let ownerInfo = await interaction.client.databaseSelectData("SELECT * FROM users WHERE user_id = ?", [auctionInfo[0].owner_id]);
                let bankRemainingCapacity = (ownerInfo.level * 1000) - sellerBankInfo.value;


                var tempDate = new Date();
                var dateStrT =
                    ("00" + tempDate.getDate()).slice(-2) + "/" +
                    ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                    tempDate.getFullYear() + " " +
                    ("00" + tempDate.getHours()).slice(-2) + ":" +
                    ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                    ("00" + tempDate.getSeconds()).slice(-2);

                if (bankRemainingCapacity < requiredGold) {
                    requiredGold = requiredGold - bankRemainingCapacity;
                    // add gold to bank
                    var transactionHistory = sellerBankInfo.history.split(';');
                    transactionHistory.shift();
                    transactionHistory.push(`+ ${requiredGold} A [${dateStrT}]`);
                    await interaction.client.databaseEditData("UPDATE bank SET value = ?, history = ? WHERE user_id = ?", [sellerBankInfo.value + bankRemainingCapacity, transactionHistory.join(";"), auctionInfo[0].owner_id]);
                    // add gold to user
                    await interaction.client.databaseEditData("UPDATE users SET gold = ? WHERE user_id = ?", [ownerInfo.gold + requiredGold, auctionInfo[0].owner_id]);
                    if (ownerInfo.discord_dm == null || ownerInfo.discord_dm == "") {
                        var getDMChannel = await fetch(`https://api.obelisk.club/DMAPI/get_dm_channel`, {
                            method: 'POST',
                            headers: {
                                'x-api-key': process.env.API_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                user_id: auctionInfo[0].owner_id
                            })
                        })
                            .then(response => response.json())
                            .then(data => { return data });
                        if (getDMChannel.success) {
                            ownerInfo.discord_dm = getDMChannel.channel_id;
                            await interaction.client.databaseEditData("UPDATE users SET discord_dm = ? WHERE user_id = ?", [getDMChannel.channel_id, auctionInfo[0].owner_id]);
                        }
                    }
                    if (ownerInfo.discord_dm != null || ownerInfo.discord_dm != "") {
                        let embed = new MessageEmbed()
                            .setColor('0x14e188')
                            .setTitle(`[${auctionInfo[0].code}] - SOLD`)
                            .addFields(
                                { name: "Price per unit", value: auctionInfo[0].value.toString(), inline: true },
                                { name: "Quantity", value: `${buyoutAmount}/${auctionInfo[0].quantity}`, inline: true },
                                {
                                    name: "Item",
                                    value: `<@${interaction.user.id}> bought **${buyoutAmount}x ${auctionInfo[0].item.replaceAll('_', ' ')}** for **${originalRequiredGold}** gold`, inline: true
                                },
                                { name: "Total", value: `\`\`\`css\nOriginal Price: ${originalRequiredGold}\nAuction Fee: -20%\nIncome: ${requiredGold}\`\`\``, inline: true }
                            )
                            .setImage("https://obelisk.club/npc/auction.png")
                            .setTimestamp(date)
                            .setFooter({ text: `${bankRemainingCapacity} gold have been added in your back.`, iconURL: interaction.client.user.avatarURL() });
                        requestBody = {
                            channel_id: ownerInfo.discord_dm,
                            message: [{
                                tts: false,
                                embeds: [embed]
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
                    }
                } else {
                    var transactionHistory = sellerBankInfo.history.split(';');
                    transactionHistory.shift();
                    transactionHistory.push(`+ ${requiredGold} A [${dateStrT}]`);
                    await interaction.client.databaseEditData("UPDATE bank SET value = value + ?, history = ? WHERE user_id = ?", [requiredGold, transactionHistory.join(";"), auctionInfo[0].owner_id]);
                    if (ownerInfo.discord_dm == null || ownerInfo.discord_dm == "") {
                        var getDMChannel = await fetch(`https://api.obelisk.club/DMAPI/get_dm_channel`, {
                            method: 'POST',
                            headers: {
                                'x-api-key': process.env.API_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                user_id: auctionInfo[0].owner_id
                            })
                        })
                            .then(response => response.json())
                            .then(data => { return data });

                        if (getDMChannel.success) {
                            ownerInfo.discord_dm = getDMChannel.channel_id;
                            await interaction.client.databaseEditData("UPDATE users SET discord_dm = ? WHERE user_id = ?", [getDMChannel.channel_id, auctionInfo[0].owner_id]);
                        }
                    }
                    if (ownerInfo.discord_dm != null || ownerInfo.discord_dm != "") {
                        let embed = new MessageEmbed()
                            .setColor('0x14e188')
                            .setTitle(`[${auctionInfo[0].code}] - SOLD`)
                            .addFields(
                                { name: "Price per unit", value: auctionInfo[0].value.toString(), inline: true },
                                { name: "Quantity", value: `${buyoutAmount}/${auctionInfo[0].quantity}`, inline: true },
                                {
                                    name: "Item",
                                    value: `<@${interaction.user.id}> bought **${buyoutAmount}x ${auctionInfo[0].item.replaceAll('_', ' ')}** for **${originalRequiredGold}** gold`, inline: true
                                },
                                { name: "Total", value: `\`\`\`css\nOriginal Price: ${originalRequiredGold}\nAuction Fee: -20%\nIncome: ${requiredGold}\`\`\``, inline: true }
                            )
                            .setImage("https://obelisk.club/npc/auction.png")
                            .setTimestamp(date)
                            .setFooter({ text: `${requiredGold} gold have been added in your back.`, iconURL: interaction.client.user.avatarURL() });
                        requestBody = {
                            channel_id: ownerInfo.discord_dm,
                            message: [{
                                tts: false,
                                embeds: [embed]
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
                    }
                }

                // add item to user inventory
                if (auctionInfo[0].type == "item") {
                    await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, auctionInfo[0].item, buyoutAmount, buyoutAmount])
                } else if (auctionInfo[0].type == "skin") {
                    await interaction.client.databaseEditData(`insert into user_skins (user_id, skin_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, auctionInfo[0].item, buyoutAmount, buyoutAmount])
                } else if (auctionInfo[0].type == "equipment") {
                    await interaction.client.databaseEditData("UPDATE created_eqp SET user_id = ? WHERE item_id = ?", [interaction.user.id, auctionInfo[0].item]);
                }
                if (buyoutAmount == auctionInfo[0].quantity) {
                    await interaction.client.databaseEditData("DELETE FROM new_auction WHERE code = ?", [auctionInfo[0].code]);

                    var dmMessage = await fetch(`https://discord.com/api/v9/channels/${auctionChannelID}/messages/${auctionInfo[0].message_id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bot ${process.env.TOKEN}`
                        }
                    });
                } else {
                    await interaction.client.databaseEditData("UPDATE new_auction SET quantity = quantity - ? WHERE code = ?", [buyoutAmount, auctionInfo[0].code]);
                    let embed = new MessageEmbed();
                    if (auctionInfo[0].type === "item") {
                        let itemInfo = await interaction.client.databaseSelectData("SELECT * FROM items WHERE name = ?", [auctionInfo[0].item]);
                        embed.setColor('0x14e188')
                            .setTitle(`Auction id [${auctionInfo[0].code}] - ${auctionInfo[0].type}`)
                            .addFields(
                                { name: "Price per unit", value: auctionInfo[0].value.toString(), inline: true },
                                { name: "Quantity", value: (auctionInfo[0].quantity - buyoutAmount).toString(), inline: true },
                                { name: "Item", value: itemInfo[0].name.replaceAll("_", " ") + `\n` + itemInfo[0].desc, inline: true }
                            )
                            .setImage("https://obelisk.club/npc/auction.png")
                            .setTimestamp(date)
                            .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });
                    } else if (auctionInfo[0].type === "skin") {
                        let skinInfo = await interaction.client.databaseSelectData("SELECT * FROM bg_info WHERE file_name = ?", [auctionInfo[0].item]);
                        skinInfo = skinInfo[0];
                        embed.setColor('0x14e188')
                            .setTitle(`Auction id [${auctionInfo[0].code}] - ${auctionInfo[0].type}`)
                            .addFields(
                                { name: "Price per unit", value: auctionInfo[0].value.toString(), inline: true },
                                { name: "Quantity", value: (auctionInfo[0].quantity - buyoutAmount).toString(), inline: true },
                                { name: "Skin", value: `Skin ID: ${skinInfo.file_name}\nType: [ ${skinInfo.bg_format.replaceAll('.', '')} ]\n[DEMO](https://obelisk.club/skins.html#atvImg__${skinInfo.id})`, inline: false }
                            )
                            .setImage("https://obelisk.club/npc/auction.png")
                            .setTimestamp(date)
                            .setFooter({ text: `Will expire on `, iconURL: interaction.client.user.avatarURL() });
                    }
                    let requestBody = {
                        tts: false,
                        embeds: [embed.toJSON()],
                    }

                    var dmMessage = await fetch(`https://discord.com/api/v9/channels/${auctionChannelID}/messages/${auctionInfo[0].message_id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bot ${process.env.TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    })
                        .then(response => response.json())
                        .then(data => { return data });
                }
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'AUCTION_EQ_BOUGHT').format(`${buyoutAmount}x ${auctionInfo[0].item.replaceAll("_", " ")}`), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });
            } else if (interaction.options.getSubcommand() === "accept") { }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('left')
            //.setLabel('Left')
            .setEmoji('887811358509379594')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('right')
            //.setLabel('Right')
            .setEmoji('887811358438064158')
            .setStyle('PRIMARY')
    );