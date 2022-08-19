const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment, ComponentType } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription("Opens pandora's shop.")
        .addStringOption(option => option
            .setName('order')
            .setDescription("Order the shop")
            .addChoices(
                { name: 'Name', value: 'name' },
                { name: 'ID', value: 'id' },
                { name: 'Currency', value: 'currency' },
            ))
        .addStringOption(option => option
            .setName("search")
            .setDescription("Search item by name")),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            function paginate(arr, size) {
                return arr.reduce((acc, val, i) => {
                    let idx = Math.floor(i / size);
                    let page = acc[idx] || (acc[idx] = []);
                    page.push(val);

                    return acc;
                }, [])
            }

            var shopData = "";
            var searchName = interaction.options.getString('search');
            var orderBy = interaction.options.getString('order');
            var auroraValue = 0

            var icons = {
                aurora: "<:Obelisk:784486454398943232>",
                gold: "<:coin2:784486506051010561>"
            }

            if (searchName === null && orderBy === null) {
                shopData = await interaction.client.databaseSelectData("select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id order by name ASC")
            } else if (searchName !== null && orderBy === null) {
                shopData = await interaction.client.databaseSelectData("select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id where (items.name like ?) OR (items.desc like ?) order by name ASC", ["%" + searchName + "%", "%" + searchName + "%"])
            } else if (searchName === null && orderBy !== null) {
                if (orderBy === "currency") {
                    shopData = await interaction.client.databaseSelectData(`select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id order by shop.currency ASC`)
                } else {
                    shopData = await interaction.client.databaseSelectData(`select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id order by items.${orderBy} ASC`)
                }
            } else {
                if (orderBy === "currency") {
                    shopData = await interaction.client.databaseSelectData(`select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id where (items.name like ?) OR (items.desc like ?) order by shop.${orderBy} ASC`, ["%" + searchName + "%", "%" + searchName + "%"])
                } else {
                    shopData = await interaction.client.databaseSelectData(`select shop.price, shop.currency, items.name, items.id, items.desc, items.type, items.value from shop inner join items on shop.item_id = items.id where (items.name like ?) OR (items.desc like ?) order by items.${orderBy} ASC`, ["%" + searchName + "%", "%" + searchName + "%"])
                }
            }

            if (shopData[0] === undefined && searchName !== null) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SHOP_NF_NAME').format(searchName))] });
            } else {
                auroraValue = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, "Aurora"])
                if (auroraValue[0] !== undefined) {
                    auroraValue = auroraValue[0].quantity;
                } else {
                    auroraValue = 0;
                }
                var itemsPerPage = 4;
                var newInventory = [];
                var stringData = "";

                for (var i = 0; i < shopData.length; i++) {
                    if (stringData === "") {
                        stringData = interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY_GOLD_AURORA').format(userInfo.gold, auroraValue)
                    }
                    stringData += `\n\`ID ${shopData[i].id}\` **${shopData[i].name.replaceAll("_", " ")} [${icons[shopData[i].currency]} ${shopData[i].price}]**\n${shopData[i].desc}`
                    if (((i + 1) % itemsPerPage) == 0 || i === shopData.length - 1) {
                        newInventory.push(stringData);
                        stringData = "";

                    }
                }

                shopData = newInventory;


                var maxPages = shopData.length;

                var embed = new MessageEmbed()
                    .setColor('0x14e188')
                    .setAuthor({ name: "Pandora's Shop" })
                    .setImage(`https://obelisk.club/npc/Shop_banner.png`)
                    .setDescription(shopData[0])
                    .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages) });
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, shopData, msg);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }

            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

function buttonHandler(userInfo, interaction, serverSettings, shopData, msg) {
    let index = 0;
    var maxPages = shopData.length - 1;

    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
        await i.defferUpdate();
        if (i.user.id != interaction.user.id) {
            return;
        }
        collector.resetTimer({ time: 15000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = new MessageEmbed()
            .setColor('0x14e188')
            .setAuthor({ name: "Pandora's Shop" })
            .setImage(`https://obelisk.club/npc/Shop_banner.png`)
            .setDescription(shopData[index])
            .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1) });
        await interaction.editReply({ embeds: [embed], components: [row] });
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

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