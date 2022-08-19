const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('To check your today log!'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        function getLast(array, x) {
            return array.slice(array.length - x)
        }
        function msToTime(duration) {
            var milliseconds = parseInt((duration % 1000) / 100),
                seconds = Math.floor((duration / 1000) % 60),
                minutes = Math.floor((duration / (1000 * 60)) % 60),
                hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
                days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 30.5),
                months = Math.floor((duration / (1000 * 60 * 60 * 24 * 30.5)) % 12),
                years = Math.floor((duration / (1000 * 60 * 60 * 24 * 30.5 * 365)) % 1);

            years = (years < 10) ? "0" + years : years;
            months = (months < 10) ? "0" + months : months;
            days = (days < 10) ? "0" + days : days;
            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;

            if (years > 0) {
                return years + "Y " + months + "M " + days + "d " + hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms";
            } else if (months > 0) {
                return months + "M " + days + "d " + hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms";
            } else if (days > 0) {
                return days + "d " + hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms";
            } else if (hours > 0) {
                return hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms";
            } else if (minutes > 0) {
                return minutes + "m " + seconds + "s " + milliseconds + "ms";
            } else if (seconds > 0) {
                return seconds + "s " + milliseconds + "ms";
            } else if (milliseconds > 0) {
                return milliseconds + "ms ";
            } else {
                return "Now";
            }
        }

        function msToDays(duration) {
            var milliseconds = parseInt((duration % 1000) / 100),
                seconds = Math.floor((duration / 1000) % 60),
                minutes = Math.floor((duration / (1000 * 60)) % 60),
                hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
                days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 24);

            days = (days < 10) ? "0" + days : days;
            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;

            if (days > 0) {
                return days;
            } else {
                return 0;
            }
        }
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            let userDailyLog = await interaction.client.databaseSelectData("select * from user_daily_logs where user_id = ? and DATE(log_date) = CURDATE()", [interaction.user.id]);
            if (userDailyLog.length == 0) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'NO_DATA'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }
            userDailyLog = JSON.parse(userDailyLog[0].log);
            var itemsPerPage = 10;
            var logPage = [];
            var stringData = "```css\n"

            for (var i = 0; i < userDailyLog.length; i++) {
                stringData += userDailyLog[i].time + ": [" + userDailyLog[i].type + "] " + userDailyLog[i].message + "\n";

                if (((i + 1) % itemsPerPage) == 0 || i === userDailyLog.length - 1) {
                    stringData += "```";
                    logPage.push(stringData);
                    stringData = "```css\n";
                }
            }

            var maxPages = logPage.length;

            var embed = interaction.client.bluePagesEmbed(logPage[0], "Logs", interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
            if (maxPages > 1) {
                await interaction.editReply({ embeds: [embed], components: [row] });
                buttonHandler(userInfo, interaction, serverSettings, logPage, msg);
            } else {
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

function buttonHandler(userInfo, interaction, serverSettings, userLogs, msg) {
    let index = 0;
    var maxPages = userLogs.length - 1;


    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
        i.defferUpdate();
        if (i.user.id !== interaction.user.id) return;
        collector.resetTimer({ time: 15000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesEmbed(userLogs[index], "Logs", interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
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