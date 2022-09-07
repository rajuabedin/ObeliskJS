const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cd')
        .setDescription('Command to check all your command cooldown.'),

    async execute(interaction, userInfo, serverSettings) {
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
                return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
            } else if (hours > 0) {
                return hours + "h " + minutes + "m " + seconds + "s";
            } else if (minutes > 0) {
                return minutes + "m " + seconds + "s";
            } else if (seconds > 0) {
                return seconds + "s " + milliseconds + "ms";
            } else if (milliseconds > 0) {
                return milliseconds + "ms";
            } else {
                return "Ready";
            }
        }
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            var userCDData = await interaction.client.databaseSelectData("select * from user_cd where user_id = ?", [interaction.user.id]);
            if (userCDData[0] === undefined) {
                userCDData[0] = {
                    id: 1524,
                    user_id: '400614330921648132',
                    hunt: '09/03/2022 22:29:44',
                    gathering: 'null',
                    rob: 'null',
                    slot: 'null',
                    dungeon: 'null',
                    quest: 'null',
                    bot_vote: 'null',
                    server_vote: 'null',
                    passive_mode: 'null',
                    gift: 'null'
                };
                await interaction.client.databaseEditData("insert into user_cd (user_id) values(?)", [interaction.user.id])
            }
            if (userCDData[0] !== undefined) {
                userCDData = userCDData[0];

                var notReadyEmoji = "\n<:delete:814090797909409802>";
                var readyEmoji = "\n<:ok_128px:814090797942439936>"

                var todayDate = new Date();

                var cdString = ""
                var millLeft = "";
                // vote bot
                if (userCDData.bot_vote !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.bot_vote).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Vote Bot: **${millLeft}` : notReadyEmoji + " " + `**Vote Bot: **${millLeft}`;

                // vote server
                if (userCDData.server_vote !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.server_vote).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Vote Server: **${millLeft}` : notReadyEmoji + " " + `**Vote Server: **${millLeft}`;

                // vote daily
                var dailyData = await interaction.client.databaseSelectData("select * from daily where user_id = ?", [interaction.user.id]);
                if (dailyData[0] === undefined) {
                    dailyData = {
                        date: "None"
                    };
                    await interaction.client.databaseEditData("insert into daily (user_id) values (?)", [interaction.user.id]);
                } else {
                    dailyData = dailyData[0];
                }
                if (dailyData.date !== 'None') {
                    millLeft = interaction.client.strToDate(dailyData.date).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }
                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Daily: **${millLeft}` : notReadyEmoji + " " + `**Daily: **${millLeft}`;

                //  hunt
                if (userCDData.hunt !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.hunt).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }

                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Hunt: **${millLeft}` : notReadyEmoji + " " + `**Hunt: **${millLeft}`;

                //  gathering
                if (userCDData.gathering !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.gathering).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Gathering: **${millLeft}` : notReadyEmoji + " " + `**Gathering: **${millLeft}`;

                //  rob
                if (userCDData.rob !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.rob).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Rob: **${millLeft}` : notReadyEmoji + " " + `**Rob: **${millLeft}`;

                //  passive mode
                if (userCDData.passive_mode !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.passive_mode).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Passive Mode: **${millLeft}` : notReadyEmoji + " " + `**Passive Mode: **${millLeft}`;

                //  dungeon
                if (userCDData.dungeon !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.dungeon).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Dungeon: **${millLeft}` : notReadyEmoji + " " + `**Dungeon: **${millLeft}`;

                //  new quest
                if (userCDData.quest !== 'null') {
                    millLeft = interaction.client.strToDate(userCDData.quest).getTime() - todayDate.getTime();
                    millLeft = msToTime(millLeft);
                } else {
                    millLeft = "Ready";
                }


                cdString += (millLeft === "Ready") ? readyEmoji + " " + `**New Quest: **${millLeft}` : notReadyEmoji + " " + `**New Quest: **${millLeft}`;

                if (userInfo.pet_id !== 'null') {
                    var familiarData = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                    familiarData = familiarData[0];
                    if (familiarData.last_feed_time !== 'null') {
                        millLeft = interaction.client.strToDate(familiarData.last_feed_time).getTime() - todayDate.getTime();
                        millLeft = msToTime(millLeft);
                    } else {
                        millLeft = "Ready";
                    }
                    cdString += (millLeft === "Ready") ? readyEmoji + " " + `**Familiar Feed: **${millLeft}` : notReadyEmoji + " " + `**Familiar Feed: **${millLeft}`;

                }

                await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(cdString, interaction.client.getWordLanguage(serverSettings.lang, 'COMMAND_CD_TITLE'), interaction.user)] })

            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}