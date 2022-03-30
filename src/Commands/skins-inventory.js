const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skins')
        .setDescription('Skins related commands.')
        .addSubcommand(subcommand => subcommand
            .setName('inventory', 'inventory')
            .setDescription("Opens your skin inventory")
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
            .setDescription("Change you profile theme")
            .addStringOption(option => option
                .setName('name', 'name')
                .setDescription("Skin Name")
                .setRequired(true)))
    ,
    // .addSubcommand(subcommand => subcommand
    //     .setName("trade", 'trade')
    //     .setDescription("Trade skin with another player")
    //     .addStringOption(option => option
    //         .setName('name', 'name')
    //         .setDescription("Skin Name")
    //         .setRequired(true))
    //     .addUserOption(option => option
    //         .setName('user', 'user')
    //         .setDescription("Mentione the user that you want to start a trade")
    //         .setRequired(true))
    //     .addStringOption(option => option
    //         .setName("trade_for", "trade_for")
    //         .setDescription("What you want to trade for")
    //         .addChoice("gold", "gold")
    //         .addChoice("skin", "skin")
    //         .setRequired(true))
    //     .addStringOption(option => option
    //         .setName("value", "value")
    //         .setDescription("Value to recieve")
    //         .setRequired(true)))

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        // try {
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

        var userSkinInventory = "";
        if (interaction.options.getSubcommand() === "inventory") {
            var searchName = interaction.options.getString('search');
            var orderBy = interaction.options.getString('order');

            if (searchName === null && orderBy === null) {
                userSkinInventory = await interaction.client.databaseSelectData("SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.quantity > 1", [interaction.user.id])
            } else if (searchName !== null && orderBy === null) {
                userSkinInventory = await interaction.client.databaseSelectData("SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name like ? and user_skins.quantity > 1", [interaction.user.id, "%" + searchName + "%"])
            } else if (searchName === null && orderBy !== null) {
                if (orderBy === "quantity") {
                    userSkinInventory = await interaction.client.databaseSelectData(`SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.quantity > 1 order by user_skins.${orderBy} DESC`, [interaction.user.id])
                } else {
                    userSkinInventory = await interaction.client.databaseSelectData(`SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.quantity > 1 order by user_skins.${orderBy} ASC`, [interaction.user.id])
                }
            } else {
                if (orderBy === "quantity") {
                    userSkinInventory = await interaction.client.databaseSelectData(`SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name like ? and user_skins.quantity > 1 order by user_skins.${orderBy} DESC`, [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
                } else {
                    userSkinInventory = await interaction.client.databaseSelectData(`SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name like ? and user_skins.quantity > 1 order by user_skins.${orderBy} ASC`, [interaction.user.id, "%" + searchName + "%", "%" + searchName + "%"])
                }
            }

            if (userSkinInventory[0] === undefined && searchName === null) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_EMPTY'))] });
            } else if (userSkinInventory[0] === undefined && searchName !== null) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_NF_NAME').format(searchName))] });
            } else {
                var itemsPerPage = 4;
                var newInventory = [];
                var stringData = ""

                for (var i = 0; i < userSkinInventory.length; i++) {
                    if (stringData === "") {
                        stringData = interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_USING').format(userInfo.selected_bg) + "\n"
                    }
                    stringData += `\n**SKIN ID**\`${userSkinInventory[i].skin_name}\`\n${interaction.client.getWordLanguage(serverSettings.lang, "QUANTITY")} - ${userSkinInventory[i].quantity} [${interaction.client.getWordLanguage(serverSettings.lang, 'DEMO')}](https://obelisk.club/skins.html#atvImg__${userSkinInventory[i].id})`

                    if (((i + 1) % itemsPerPage) == 0 || i === userSkinInventory.length - 1) {
                        newInventory.push(stringData);
                        stringData = ""
                    }
                }

                userSkinInventory = newInventory;

                var maxPages = userSkinInventory.length;

                var embed = interaction.client.bluePagesEmbed(userSkinInventory[0], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format("Skins"), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                if (maxPages > 1) {
                    await interaction.reply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, userSkinInventory);
                } else {
                    await interaction.reply({ embeds: [embed] });
                }

            }
        } else if (interaction.options.getSubcommand() === "use") {
            var skinInventory = await interaction.client.databaseSelectData("select * from user_skins where user_id = ? and skin_name = ?", [interaction.user.id, interaction.options.getString('name')])

            if (skinInventory[0] === undefined || skinInventory[0].quantity < 1) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_NO'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
            } else {
                skinInventory = skinInventory[0];
                await userDailyLogger(interaction, "skins", `Changed profile theme to [${skinInventory.skin_name}]`)
                await interaction.client.databaseEditData("update user_skins set quantity = quantity - 1 where user_id = ? and skin_name = ?", [interaction.user.id, interaction.options.getString('name')]);
                await interaction.client.databaseEditData("update users set previous_bg = selected_bg, selected_bg = ? where user_id = ?", [skinInventory.skin_name, interaction.user.id]);
                const donatorData = await interaction.client.databaseSelectData("select * from patreon_donators where user_id = ?", [interaction.user.id]);
                var isADonator = false
                if (donatorData[0] !== undefined) {
                    if (donatorData[0]["donation_rank"] > 0) {
                        isADonator = true;
                    }
                }
                if (/[a-zA-Z]/g.test(skinInventory.skin_name) || isADonator) {
                    await interaction.client.databaseEditData(`insert into user_skins (user_id, skin_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, userInfo.selected_bg, 1, 1]);
                    await userDailyLogger(interaction, "skins", `Skins [${userInfo.selected_bg}] added back to your skin inventory`);
                }
                return await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_CHANGED').format(userInfo.selected_bg, interaction.options.getString('name').toUpperCase()), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESSFUL'))] })
            }
        } else if (interaction.options.getSubcommand() === "trade") {
            var skinData = await interaction.client.databaseSelectData("SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name = ?", [interaction.user.id, interaction.options.getString('name').toUpperCase()])

            if (skinData[0] === undefined || skinData[0].quantity < 1) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_NO'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
            } else {
                skinData = skinData[0];

                if (skinData.tradable.toLowerCase() === "no") {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_TRADE_BLOCK'))] })
                }

                var tradeUser = interaction.options.getUser('user');
                var value = interaction.options.getString('value');
                var tryingToBeAMonke = false;
                var tradeSkinData = "";

                if (interaction.options.getString('trade_for') === 'gold') {
                    value = nFormatterStringToNumber(value);
                    if (value == "error" || value < 1) {
                        tryingToBeAMonke = true;
                    }
                } else {
                    tradeSkinData = await interaction.client.databaseSelectData("SELECT user_skins.skin_name, user_skins.quantity, bg_info.id, bg_info.tradable, bg_info.bg_format from user_skins INNER join bg_info on user_skins.skin_name = bg_info.file_name where user_skins.user_id = ? and user_skins.skin_name = ?", [tradeUser.id, value.toUpperCase()]);
                    if (tradeSkinData[0] === undefined || tradeSkinData[0].quantity < 1) {
                        return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_NO_TRADE').format(tradeUser.username), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                    } else {
                        tradeSkinData = tradeSkinData[0];
                        if (tradeSkinData.tradable.toLowerCase() === "no") {
                            return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_TRADE_BLOCK'))] })
                        }
                    }
                }

                if (tradeUser.id === interaction.user.id || tryingToBeAMonke) {
                    return interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_TRADE_MONKEY'))] })
                }



                var tradeOfferEmbed = new MessageEmbed()
                    .setColor('0xffff00')
                    .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_TRADE_TITLE').format(skinData.skin_name), interaction.user.avatarURL())
                    .setDescription(interaction.client.getWordLanguage(serverSettings.lang, 'SKIN_TRADE')
                        .format(`<@${interaction.user.id}>`,
                            skinData.skin_name,
                            `https://obelisk.club/skins.html#atvImg__${skinData.id}`,
                            value,
                            ((interaction.options.getString('trade_for').toLowerCase() === "skin") ? `https://obelisk.club/skins.html#atvImg__${tradeSkinData.id}` : '`https://obelisk.club'),
                            interaction.options.getString('trade_for').toLowerCase()))
                await interaction.reply({ embeds: [tradeOfferEmbed], components: [rowTrade], content: `<@${tradeUser.id}>` })

                var tradeUserInfo = interaction.client.databaseSelectData("select * from users where user_id = ?", [tradeUser.id])

            }
        }

        // } catch (error) {
        //     if (interaction.replied) {
        //         await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        //     } else {
        //         await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        //     }
        //     errorLog.error(error.message, { 'command_name': interaction.commandName, 'sub_command': interaction.options.getSubcommand() });
        // }
    }
}


function buttonHandler(userInfo, interaction, serverSettings, userSkinInventory) {
    let index = 0;
    var maxPages = userSkinInventory.length - 1;

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
        var embed = interaction.client.bluePagesEmbed(userSkinInventory[index], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format("Skins"), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
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