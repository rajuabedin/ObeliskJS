const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borders')
        .setDescription('Borders related commands.')
        .addSubcommand(subcommand => subcommand
            .setName('inventory', 'inventory')
            .setDescription("Opens your borders inventory")
            .addStringOption(option => option
                .setName('order')
                .setDescription("Order your inventory")
                .addChoice("name", "file_name")
                .addChoice("quantity", "quantity"))
            .addStringOption(option => option
                .setName("search")
                .setDescription("Search item by name"))
        )
        .addSubcommand(subcommand => subcommand
            .setName('use', 'use')
            .setDescription("Change you profile image border")
            .addStringOption(option => option
                .setName('name', 'name')
                .setDescription("Border Name")
                .setRequired(true)))
    ,

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

            function paginate(arr, size) {
                return arr.reduce((acc, val, i) => {
                    let idx = Math.floor(i / size);
                    let page = acc[idx] || (acc[idx] = []);
                    page.push(val);

                    return acc;
                }, [])
            }

            function isAlphaOrParen(str) {
                return /^[a-zA-Z()]+$/.test(str);
            }

            var userBorderInventory = "";
            if (interaction.options.getSubcommand() === "inventory") {
                var searchName = interaction.options.getString('search');
                var orderBy = interaction.options.getString('order');

                if (searchName === null && orderBy === null) {
                    userBorderInventory = await interaction.client.databaseSelectData("SELECT quantity, border_name from user_borders where user_id = ? and quantity > 0", [interaction.user.id])
                } else if (searchName !== null && orderBy === null) {
                    userBorderInventory = await interaction.client.databaseSelectData("SELECT quantity, border_name from user_borders where user_id = ? and border_name like ? and quantity > 0", [interaction.user.id, "%" + searchName + "%"])
                } else if (searchName === null && orderBy !== null) {
                    if (orderBy === "quantity") {
                        userBorderInventory = await interaction.client.databaseSelectData(`SELECT quantity, border_name from user_borders where user_id = ? and quantity > 0 order by ${orderBy} DESC`, [interaction.user.id])
                    } else {
                        userBorderInventory = await interaction.client.databaseSelectData(`SELECT quantity, border_name from user_borders where user_id = ? and quantity > 0 order by ${orderBy} ASC`, [interaction.user.id])
                    }
                } else {
                    if (orderBy === "quantity") {
                        userBorderInventory = await interaction.client.databaseSelectData(`SELECT quantity, border_name from user_borders where user_id = ? and border_name like ? and quantity > 0 order by ${orderBy} DESC`, [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
                    } else {
                        userBorderInventory = await interaction.client.databaseSelectData(`SELECT quantity, border_name from user_borders where user_id = ? and border_name like ? and quantity > 0 order by ${orderBy} ASC`, [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
                    }
                }

                if (userBorderInventory[0] === undefined && searchName === null) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'INVENTORY_EMPTY'))] });
                } else if (userBorderInventory[0] === undefined && searchName !== null) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BORDER_NF_NAME').format(searchName))] });
                } else {
                    var itemsPerPage = 4;
                    var newInventory = [];
                    var stringData = ""

                    for (var i = 0; i < userBorderInventory.length; i++) {
                        if (stringData === "") {
                            stringData = interaction.client.getWordLanguage(serverSettings.lang, 'BORDER_INV_USING').format(userInfo.selected_border) + "\n"
                        }
                        stringData += `\n**BORDER ID**\`${userBorderInventory[i].border_name}\`\n${interaction.client.getWordLanguage(serverSettings.lang, "QUANTITY")} - ${userBorderInventory[i].quantity}`

                        if (((i + 1) % itemsPerPage) == 0 || i === userBorderInventory.length - 1) {
                            newInventory.push(stringData);
                            stringData = ""
                        }
                    }

                    userBorderInventory = newInventory;

                    var maxPages = userBorderInventory.length;

                    var embed = interaction.client.bluePagesEmbed(userBorderInventory[0], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format("Border"), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                    if (maxPages > 1) {
                        await interaction.reply({ embeds: [embed], components: [row] });
                        buttonHandler(userInfo, interaction, serverSettings, userBorderInventory);
                    } else {
                        await interaction.reply({ embeds: [embed] });
                    }

                }
            } else if (interaction.options.getSubcommand() === "use") {
                var borderInventory = "";
                if (interaction.options.getString('name').toLowerCase() === "none") {
                    borderInventory = [{
                        border_name: "None",
                        quantity: 1
                    }]
                } else {
                    borderInventory = await interaction.client.databaseSelectData("select * from user_borders where user_id = ? and border_name = ?", [interaction.user.id, interaction.options.getString('name').toUpperCase()])
                }

                if (borderInventory[0] === undefined || borderInventory[0].quantity < 1) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BORDER_NO'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                } else {
                    borderInventory = borderInventory[0];
                    await userDailyLogger(interaction, interaction.user, "borders", `Changed profile border from [${userInfo.selected_border}] to [${borderInventory.border_name}]`)
                    await interaction.client.databaseEditData("update users set selected_border = ? where user_id = ?", [borderInventory.border_name, interaction.user.id]);
                    return await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'BORDER_CHANGED').format(userInfo.selected_border, interaction.options.getString('name').toUpperCase()), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESSFUL'))] })
                }
            }

        } catch (error) {
            if (interaction.replied) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            }
            errorLog.error(error.message, { 'command_name': interaction.commandName, 'sub_command': interaction.options.getSubcommand() });
        }
    }
}


function buttonHandler(userInfo, interaction, serverSettings, userBorderInventory) {
    let index = 0;
    var maxPages = userBorderInventory.length - 1;

    const filter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
        collector.resetTimer({ time: 15000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesEmbed(userBorderInventory[index], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format("Border"), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
        await i.update({ embeds: [embed], components: [row] });
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

const rowTrade = new MessageActionRow()
    .addComponents(

        new MessageButton()
            .setCustomId('yes')
            .setLabel('✔')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('✖')
            .setStyle('DANGER'),
    );