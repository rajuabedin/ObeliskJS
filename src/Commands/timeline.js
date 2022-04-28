const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeline')
        .setDescription('Check your timeline!'),

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
        try {
            let date = new Date();
            let embed;
            let elapsedTimeFromTaskStarted = Math.floor(date.getTime() - userInfo.joined_on.getTime());
            var dateStr =
                ("00" + date.getDate()).slice(-2) + "/" +
                ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
                date.getFullYear() + " " +
                ("00" + date.getHours()).slice(-2) + ":" +
                ("00" + date.getMinutes()).slice(-2) + ":" +
                ("00" + date.getSeconds()).slice(-2) + " GMT";
            let userDailyLog = await interaction.client.databaseSelectData("select * from user_daily_logs where user_id = ? and DATE(log_date) = CURDATE()", [interaction.user.id]);
            if (userDailyLog.length == 0) {
                embed = new MessageEmbed()
                    .setColor("0xed4245")
                    .setTitle(`${interaction.user.username}'s ${interaction.client.getWordLanguage(serverSettings.lang, 'TIMELINE')}`)
                    .setDescription(`${interaction.client.getWordLanguage(serverSettings.lang, 'LAST_10_LOGS')}\n\`\`\`css\n${interaction.client.getWordLanguage(serverSettings.lang, "NO_DATA")}\`\`\``)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, 'PLAYING_FOR').format(interaction.client.user.username), `\`${msToTime(elapsedTimeFromTaskStarted)}\``, true)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, "SERVER_TIME"), dateStr, true);
            } else {
                userDailyLog = JSON.parse(userDailyLog[0].log);
                userDailyLog = getLast(userDailyLog, 10);

                let log = "";
                for (let i = 0; i < userDailyLog.length; i++) {
                    log += userDailyLog[i].time + ": [" + userDailyLog[i].type + "] " + userDailyLog[i].message + "\n";
                }

                embed = new MessageEmbed()
                    .setColor("0xfafafa")
                    .setTitle(`${interaction.user.username}'s ${interaction.client.getWordLanguage(serverSettings.lang, 'TIMELINE')}`)
                    .setDescription(`${interaction.client.getWordLanguage(serverSettings.lang, 'LAST_10_LOGS')}\n\`\`\`css\n${log}\`\`\``)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, 'PLAYING_FOR').format(interaction.client.user.username), `\`${msToTime(elapsedTimeFromTaskStarted)}\``, true)
                    .addField(interaction.client.getWordLanguage(serverSettings.lang, "SERVER_TIME"), dateStr, true);
            }
            await interaction.reply({ embeds: [embed] });

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