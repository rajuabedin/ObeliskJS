const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Open your inventory.')
        .addStringOption(option => option
            .setName('order')
            .setDescription("Order your inventory")
            .addChoices(
                { name: "Name", value: "item_name" },
                { name: "ID", value: "id" },
                { name: "Quantity", value: "quantity" },
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

            var userInventory = "";
            var searchName = interaction.options.getString('search');
            var orderBy = interaction.options.getString('order');
            var auroraValue = 0

            if (searchName === null && orderBy === null) {
                userInventory = await interaction.client.databaseSelectData("select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and user_inventory.item_name != 'Aurora' order by id ASC", [interaction.user.id])
            } else if (searchName !== null && orderBy === null) {
                userInventory = await interaction.client.databaseSelectData("select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and ((user_inventory.item_name like ?) or (items.desc like ?)) and user_inventory.item_name != 'Aurora' order by id ASC", [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
            } else if (searchName === null && orderBy !== null) {
                if (orderBy === "quantity") {
                    userInventory = await interaction.client.databaseSelectData(`select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and user_inventory.item_name != 'Aurora' order by user_inventory.${orderBy} DESC`, [interaction.user.id])
                } else {
                    userInventory = await interaction.client.databaseSelectData(`select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and user_inventory.item_name != 'Aurora' order by user_inventory.${orderBy} ASC`, [interaction.user.id])
                }
            } else {
                userInventory = await interaction.client.databaseSelectData(`select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and ((user_inventory.item_name like ?) or (items.desc like ?)) and user_inventory.item_name != 'Aurora' order by user_inventory.${orderBy} ASC`, [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
            }

            if (userInventory[0] === undefined && searchName === null) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY_EMPTY'))] });
            } else if (userInventory[0] === undefined && searchName !== null) {
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
                var stringData = ""

                for (var i = 0; i < userInventory.length; i++) {
                    if (stringData === "") {
                        stringData = interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY_GOLD_AURORA').format(userInfo.gold, auroraValue)
                    }
                    stringData += `\n\`ID ${userInventory[i].id}\` **${userInventory[i].item_name.replaceAll("_", " ")} [<:coin2:784486506051010561> ${userInventory[i].value}]**\n${userInventory[i].desc} - **${userInventory[i].quantity}**`

                    if (((i + 1) % itemsPerPage) == 0 || i === userInventory.length - 1) {
                        newInventory.push(stringData);
                        stringData = ""
                    }
                }

                userInventory = newInventory;

                var maxPages = userInventory.length;

                var embed = interaction.client.bluePagesEmbed(userInventory[0], interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, userInventory, msg);
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

function buttonHandler(userInfo, interaction, serverSettings, userInventory, msg) {
    let index = 0;
    var maxPages = userInventory.length - 1;


    const collector = msg.createMessageComponentCollector({ time: 40000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.user.id != interaction.user.id) {
            return;
        }
        collector.resetTimer({ time: 40000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesEmbed(userInventory[index], interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
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