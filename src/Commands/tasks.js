const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Ping command!'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        function msToTime(duration) {
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
                return "Ready";
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
            let userTask = await interaction.client.databaseSelectData("select * from task where user_id = ?", [interaction.user.id]);
            userTask = userTask[0];
            var date = new Date();

            const tomorrow = new Date(date);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            var dateStr =
                ("00" + tomorrow.getDate()).slice(-2) + "/" +
                ("00" + (tomorrow.getMonth() + 1)).slice(-2) + "/" +
                tomorrow.getFullYear() + " " +
                ("00" + tomorrow.getHours()).slice(-2) + ":" +
                ("00" + tomorrow.getMinutes()).slice(-2) + ":" +
                ("00" + tomorrow.getSeconds()).slice(-2);

            let elapsedTimeFromTaskStarted = 0;

            if (userTask.time !== "None") {
                elapsedTimeFromTaskStarted = Math.floor((interaction.client.strToDate(userTask.time).getTime() - date.getTime()));
                // check remaining time 
                if (elapsedTimeFromTaskStarted < 1) {
                    // reset task
                    await interaction.client.databaseEditData("update task set daily = 0, vote_bot= 0, hunt = 0, gathering=0, status = 'open', time = ? where user_id = ?", [dateStr, interaction.user.id]);
                    elapsedTimeFromTaskStarted = Math.floor((tomorrow.getTime() - date.getTime()));
                    // log
                    userDailyLogger(interaction, interaction.user, "task", "New Task started!");
                    userTask = {
                        daily: 0,
                        vote_bot: 0,
                        hunt: 0,
                        gathering: 0,
                        status: "open",
                        time: tomorrow
                    }
                }
            }

            if (userTask.daily > 0 && userTask.vote_bot > 0 && userTask.hunt > 10 && userTask.gathering > 10) {
                userTask.status = "completed";
            }

            let embed;

            if (userTask.status === "completed") {
                embed = new MessageEmbed()
                    .setColor("0x14e188")
                    .setTitle(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_TASK"))
                    .setThumbnail(interaction.user.avatarURL())
                    .setDescription(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_TASK_COMPLETED").format(msToTime(elapsedTimeFromTaskStarted)))
                    .setImage("https://obelisk.club/npc/task-completed.png")
            } else {
                let description = "";

                if (userTask.daily > 0) {
                    description += `\n<:ok_128px:814090797942439936> **Daily:** ${userTask.daily}/1`;
                } else {
                    description += `\n<:delete:814090797909409802> **Daily:** 0/1`;
                }

                if (userTask.vote_bot > 0) {
                    description += `\n<:ok_128px:814090797942439936> **Vote Bot:** ${userTask.vote_bot}/1`;
                } else {
                    description += `\n<:delete:814090797909409802> **Vote Bot:** 0/1`;
                }

                if (userTask.hunt > 9) {
                    description += `\n<:ok_128px:814090797942439936> **Hunt:** ${userTask.hunt}/10`;
                } else {
                    description += `\n<:delete:814090797909409802> **Hunt:** ${userTask.hunt}/10`;
                }

                if (userTask.gathering > 9) {
                    description += `\n<:ok_128px:814090797942439936> **Gathering:** ${userTask.gathering}/10`;
                } else {
                    description += `\n<:delete:814090797909409802> **Gathering:** ${userTask.gathering}/10`;
                }

                description += `\n\n${interaction.client.getWordLanguage(serverSettings.lang, "DAILY_TASK_NEW_TIME").format(msToTime(elapsedTimeFromTaskStarted))}`;

                embed = new MessageEmbed()
                    .setColor("0xfafafa")
                    .setTitle(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_TASK"))
                    .setThumbnail(interaction.user.avatarURL())
                    .setDescription(description)
                    .setImage("https://obelisk.club/npc/task-open.png")
                    .setFooter(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_TASK_INFO"), interaction.client.user.avatarURL());
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