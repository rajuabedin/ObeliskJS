const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('This command lets you access your bank')
        .addStringOption(option =>
            option.setName("transaction")
                .setDescription("Transaction options")
                .addChoice("deposit", "deposit")
                .addChoice("withdraw", "withdraw")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("value")
                .setDescription("Gold value")
                .setRequired(false)),


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
        try {
            var transactionOption = interaction.options.getString('transaction');
            var value = interaction.options.getString('value');

            var userBankData = await interaction.client.databaseSelectData("select * from bank where user_id = ?", [interaction.user.id]);
            userBankData = userBankData[0];

            var maxBankValue = userInfo.level * 1000;


            // check if bank data is available
            if (userBankData === undefined) {
                userBankData = {
                    value: 0,
                    last_deposit: "N/A",
                    last_withdraw: "N/A",
                    history: "No transaction found;;;;"
                }
                await interaction.client.databaseEditData("insert into back (user_id) values (?)", [interaction.user.id])
            }

            if (transactionOption === null) {
                var transactionHistory = userBankData.history.replaceAll(';', '\n');

                const bankEmbed = new MessageEmbed()
                    .setColor('0x14e188')
                    .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_ACC').format(interaction.user.username), interaction.user.avatarURL())
                    .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, 'GOLD'), `${userBankData.value}/${userInfo.level * 1000}`)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_LAST_TRANSACTION'), "```css\n" + transactionHistory + "```");
                await interaction.reply({ embeds: [bankEmbed], components: [] });
            } else if (transactionOption == "deposit") {
                if (value === null) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_VALUE_MISSING'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                } else if (value == "all") {
                    value = maxBankValue - userBankData.value;
                } else {
                    value = nFormatterStringToNumber(value);
                    if (value == "error" || value < 0) {
                        return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_VALUE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                }

                if (value <= userInfo.gold) {
                    if (value > (maxBankValue - userBankData.value) || value < 1) {
                        const bankEmbed = new MessageEmbed()
                            .setColor('0xed4245')
                            .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT'))
                            .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                            .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BANK_MAX_GOLD').format(value));
                        return await interaction.reply({ embeds: [bankEmbed] });
                    }

                    var tempDate = new Date();
                    var dateStr =
                        ("00" + tempDate.getDate()).slice(-2) + "/" +
                        ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                        tempDate.getFullYear() + " " +
                        ("00" + tempDate.getHours()).slice(-2) + ":" +
                        ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                        ("00" + tempDate.getSeconds()).slice(-2);
                    var transactionHistory = userBankData.history.split(';');
                    transactionHistory.shift();
                    transactionHistory.push(`+ ${value} D [${dateStr}]`);
                    await interaction.client.databaseEditData("update users set gold = gold - ? where user_id = ?", [value, interaction.user.id]);
                    await interaction.client.databaseEditData("update bank set value = value + ?, history = ? where user_id = ?", [value, transactionHistory.join(";"), interaction.user.id]);
                    const bankEmbed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT'))
                        .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT_COMPLETED').format(value));
                    return await interaction.reply({ embeds: [bankEmbed] });
                } else {
                    const bankEmbed = new MessageEmbed()
                        .setColor('0xed4245')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT'))
                        .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_GOLD').format(value));
                    return await interaction.reply({ embeds: [bankEmbed] });
                }
            } else if (transactionOption == "withdraw") {
                if (userBankData.value < 1) {
                    const bankEmbed = new MessageEmbed()
                        .setColor('0xed4245')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT'))
                        .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_BANK_EMPTY_GOLD').format(value));
                    return await interaction.reply({ embeds: [bankEmbed] });
                }
                if (value === null) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_VALUE_MISSING'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                } else if (value == "all") {
                    value = userBankData.value;
                } else {
                    value = nFormatterStringToNumber(value);
                    if (value == "error" || value < 1) {
                        return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_VALUE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                }
                if (value <= userBankData.value) {
                    var tempDate = new Date();
                    var dateStr =
                        ("00" + tempDate.getDate()).slice(-2) + "/" +
                        ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                        tempDate.getFullYear() + " " +
                        ("00" + tempDate.getHours()).slice(-2) + ":" +
                        ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                        ("00" + tempDate.getSeconds()).slice(-2);
                    var transactionHistory = userBankData.history.split(';');
                    transactionHistory.shift();
                    transactionHistory.push(`- ${value} W [${dateStr}]`);
                    await interaction.client.databaseEditData("update users set gold = gold + ? where user_id = ?", [value, interaction.user.id]);
                    await interaction.client.databaseEditData("update bank set value = value - ?, history = ? where user_id = ?", [value, transactionHistory.join(";"), interaction.user.id]);
                    const bankEmbed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_DEPOSIT'))
                        .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'BANK_WITHDRAW_COMPLETED').format(value));
                    return await interaction.reply({ embeds: [bankEmbed] });
                } else {
                    const bankEmbed = new MessageEmbed()
                        .setColor('0xed4245')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_WITHDRAW'))
                        .setThumbnail(`https://obelisk.club/npc/BANK_LOGO.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'BANK_RESPONSE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_GOLD_BANK').format(value));
                    return await interaction.reply({ embeds: [bankEmbed] });
                }
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

function buttonHandler(interaction, serverSettings, userInfo, userBankData) {

    const filter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
        collector.resetTimer({ time: 15000 });
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

}

const rowDeposityWithdraw = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('deposit')
            .setLabel('DEPOSIT')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('withdraw')
            .setLabel('WITHDRAW')
            .setStyle('PRIMARY'),
    );

const rowDeposityWithdrawDisabled = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('deposit')
            .setLabel('DEPOSIT')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('withdraw')
            .setLabel('WITHDRAW')
            .setStyle('PRIMARY')
            .setDisabled(true),
    );

const rowDeposityDisabledWithdraw = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('deposit')
            .setLabel('DEPOSIT')
            .setStyle('PRIMARY')
            .setDisabled(true),
        new MessageButton()
            .setCustomId('withdraw')
            .setLabel('WITHDRAW')
            .setStyle('PRIMARY'),
    );