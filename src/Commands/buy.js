const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy items from the shop.')
        .addIntegerOption(option => option
            .setName("id", "id")
            .setDescription("The id of the item that you want to buy"))
        .addStringOption(option => option
            .setName("name", "name")
            .setDescription("The name of the item that you want to buy"))
        .addStringOption(option => option
            .setName("quantity", "quantity")
            .setDescription("Quantity that you want to buy")),

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

            var id = interaction.options.getInteger("id");
            var name = interaction.options.getString("name");
            var quantity = interaction.options.getString("quantity");
            var icons = {
                aurora: "<:Obelisk:784486454398943232>",
                gold: "<:coin2:784486506051010561>"
            }

            if (quantity == null) {
                quantity = 1;
            } else {
                quantity = nFormatterStringToNumber(quantity);
                if (quantity == "error" || quantity < 1) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_QUANTITY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
            }
            if (id !== null && name === null) {
                var shopItemInfo = await interaction.client.databaseSelectData("select shop.item_id, shop.price, shop.currency, items.name from shop inner join items on shop.item_id = items.id where shop.item_id = ?", [id]);
            } else if (id === null && name !== null) {
                var shopItemInfo = await interaction.client.databaseSelectData("select shop.item_id, shop.price, shop.currency, items.name from shop inner join items on shop.item_id = items.id where items.name = ?", [name.replaceAll(" ", "_")]);
            } else {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BUY_ID_NAME'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            if (shopItemInfo[0] === undefined) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            } else {
                shopItemInfo = shopItemInfo[0];
                await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BUY_MONKEY').format(quantity, shopItemInfo.name.replaceAll("_", " "), "https://obelisk.club/", shopItemInfo.price * quantity, icons[shopItemInfo.currency]), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION'))], components: [rowYesNo] });
                buttonHandler(interaction, serverSettings, shopItemInfo, quantity)
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}
function buttonHandler(interaction, serverSettings, shopItemInfo, quantity, msg) {
    var bought = false;

    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
        i.deferUpdate();
        if (i.user.id !== interaction.user.id) return;
        if (i.customId === 'no') {
            collector.stop();
            return interaction.editReply({ components: [], embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CANCELLED"))] })
        }
        else if (i.customId === 'yes') {
            if (shopItemInfo.currency === "gold") {
                var goldCost = shopItemInfo.price * quantity;
                var userGold = await interaction.client.databaseSelectData("select gold from users where user_id = ?", [interaction.user.id]);
                userGold = userGold[0].gold;
                if (userGold < goldCost) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_GOLD').format(goldCost))], components: [] })
                } else {
                    await interaction.client.databaseEditData("update users set gold = gold - ? where user_id = ?", [goldCost, interaction.user.id]);
                    bought = true;
                }
            } else {
                var auroraCost = shopItemInfo.price * quantity;
                var userAurora = await interaction.client.databaseSelectData("select quantity from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, "Aurora"]);
                if (userAurora[0] === undefined || userAurora[0].quantity < auroraCost) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_AURORA').format(auroraCost))], components: [] })
                } else {
                    await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [auroraCost, interaction.user.id, "Aurora"])
                    bought = true;
                }
            }

            if (bought) {
                await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, shopItemInfo.name, quantity, quantity]);
                return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BOUGHT_SHOP').format(quantity, shopItemInfo.name.replaceAll("_", " ")))], components: [] })
            }
        }
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

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