const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('This command lets you get your daily rewards.'),

    async execute(interaction, userInfo, serverSettings) {
        let msg = await interaction.deferReply({ fetchReply: true });
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
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "DAILY_REWARD_NEXT").format(" `" + (msToTime(elapsedTimeFromHunt) + "`"), "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Daily"))], ephemeral: true });;
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

            if (donatorData.length > 0) {
                userIsDonator = true;
            } else {
                userIsDonator = await getUserInfoDonator(interaction.user.id);
            }

            var userIsBooster = false;

            // check if user is a donator
            // patreon
            const boosterData = await interaction.client.databaseSelectData("select * from server_booster where user_id = ?", [interaction.user.id]);

            if (boosterData[0] !== undefined) {
                userIsBooster = true;
            } else {
                userIsBooster = await getUserInfoBooster(interaction.user.id);
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
            await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, 'DAILY_REWARD_GOLD').format(rewards, multiplier), interaction.client.getWordLanguage(serverSettings.lang, 'DAILY_REWARD'), interaction.user)] })


            var dateStr =
                ("00" + tomorrow.getDate()).slice(-2) + "/" +
                ("00" + (tomorrow.getMonth() + 1)).slice(-2) + "/" +
                tomorrow.getFullYear() + " " +
                ("00" + tomorrow.getHours()).slice(-2) + ":" +
                ("00" + tomorrow.getMinutes()).slice(-2) + ":" +
                ("00" + tomorrow.getSeconds()).slice(-2);
            let userTask = await interaction.client.databaseSelectData("select * from task where user_id = ?", [interaction.user.id]);
            userTask = userTask[0];
            let elapsedTimeFromTaskStarted = 0;

            if (userTask.time !== "None") {
                elapsedTimeFromTaskStarted = Math.floor((interaction.client.strToDate(userTask.time).getTime() - date.getTime()));
                // check remaining time 
                if (elapsedTimeFromTaskStarted < 1) {
                    // reset task
                    await interaction.client.databaseEditData("update task set daily = 1, vote_bot= 0, hunt = 0, gathering=0, status = 'open', time = ? where user_id = ?", [dateStr, interaction.user.id]);
                } else {
                    // update task
                    await interaction.client.databaseEditData("update task set daily = daily + 1 where user_id = ?", [interaction.user.id]);
                }
            }

        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}


async function getUserInfoBooster(userId) {
    requestBody = {
        user_id: userId
    }

    var data = await fetch(`https://api.obelisk.club/DMAPI/get_user`, {
        method: 'POST',
        headers: {
            'x-api-key': process.env.API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => response.json())
        .then(data => { return data });
    if (data.success === true && data.Data[0].roles.includes("760193294054588457")) {
        return true;
    } else {
        return false;
    }
}

async function getUserInfoDonator(userId) {
    requestBody = {
        user_id: userId
    }

    var data = await fetch(`https://api.obelisk.club/DMAPI/get_user`, {
        method: 'POST',
        headers: {
            'x-api-key': process.env.API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => response.json())
        .then(data => { return data });
    if (data.success === true) {
        if (data.Data[0].roles.includes("800399000141430796")) {
            return true;
        } else if (data.Data[0].roles.includes("772832085231665194")) {
            return true;
        } else if (data.Data[0].roles.includes("772832009851895810")) {
            return true;
        } else if (data.Data[0].roles.includes("760205852585099275")) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}