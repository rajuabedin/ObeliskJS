const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('This command lets you get your daily rewards.'),

    async execute(interaction, userInfo, serverSettings) {

        try {
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
            var dailyData = await interaction.client.databaseSelectData("select * from daily where user_id = ?", [interaction.user.id]);
            if (dailyData[0] === undefined) {
                dailyData = {
                    date: "None",
                    m_date: "None",
                    daily_stack: 0,
                    m_daily_stack: 0
                };
                await interaction.client.databaseEditData("insert into daily (user_id) values (?)", [interaction.user.id]);
            } else {
                dailyData = dailyData[0];
            }
            var dayPassedSinceLast = 0;
            var multiplier = 1;

            var date = new Date();

            if (dailyData.date !== "None") {
                let elapsedTimeFromHunt = Math.floor((interaction.client.strToDate(dailyData.date).getTime() - date.getTime()));
                dayPassedSinceLast = msToDays(elapsedTimeFromHunt * (-1));
                // check remaining time 
                if (elapsedTimeFromHunt > 0) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_REWARD_NEXT").format(" `" + (msToTime(elapsedTimeFromHunt) + "`"), "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Daily"))], ephemeral: true });;
                }
            }


            if (dayPassedSinceLast < 1) {
                multiplier = dailyData.daily_stack + 1;
            }

            var gold = Math.ceil(300 + (100 * 0.1) * multiplier)

            var rewards = `Daily Gold -> ${gold}`;
            var userIsDonator = false;

            var foundDrops = []

            // check if user is a donator
            // patreon
            const donatorData = await interaction.client.databaseSelectData("select * from patreon_donators where user_id = ?", [interaction.user.id]);

            if (donatorData[0] !== undefined) {
                userIsDonator = true;
            }

            var userIsBooster = false;

            // check if user is a donator
            // patreon
            const boosterData = await interaction.client.databaseSelectData("select * from server_booster where user_id = ?", [interaction.user.id]);

            if (boosterData[0] !== undefined) {
                userIsBooster = true;
            }

            if (userIsBooster) {
                rewards += "\nServer Booster -> 1x Aurora";
                foundDrops.push(['Aurora', 1]);
            }

            if (userIsDonator) {
                rewards += "\nDonator -> 1x Aurora";
                foundDrops.push(['Aurora', 1]);
            }

            if (foundDrops.length > 0) {
                for (var i = 0; i < foundDrops.length; i++) {
                    await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, foundDrops[i][0], foundDrops[i][1], foundDrops[i][1]])
                }
            }

            await interaction.client.databaseEditData("update users set gold = gold + ? WHERE user_id = ?", [gold, interaction.user.id]);

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

            await interaction.client.databaseEditData("update daily set daily_stack = ?, date = ? WHERE user_id = ?", [multiplier, dateStr, interaction.user.id])
            await interaction.reply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, 'DAILY_REWARD_GOLD').format(rewards, multiplier), interaction.client.getWordLanguage(serverSettings.lang, 'DAILY_REWARD'), interaction.user)] })

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