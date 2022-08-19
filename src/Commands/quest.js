const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Quest info!')
        .addSubcommand(subcommand => subcommand
            .setName("info", "info")
            .setDescription("Check quest info"))
        .addSubcommand(subcommand => subcommand
            .setName("board", "board")
            .setDescription("Opens quest board")
            .addNumberOption(option => option
                .setName("id", "id")
                .setDescription("Find by quest ID")))
        .addSubcommand(subcommand => subcommand
            .setName("new", "new")
            .setDescription("Get new quest")),

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
                return days + "d " + hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (hours > 0) {
                return hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (minutes > 0) {
                return minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (seconds > 0) {
                return seconds + "s " + milliseconds + "ms ";
            } else if (milliseconds > 0) {
                return milliseconds + "ms ";
            } else {
                return interaction.client.getWordLanguage(serverSettings.lang, 'EXPIRED_QUEST');
            }
        }
        function msToTimeReady(duration) {
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
                return days + "d " + hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (hours > 0) {
                return hours + "h " + minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (minutes > 0) {
                return minutes + "m " + seconds + "s " + milliseconds + "ms ";
            } else if (seconds > 0) {
                return seconds + "s " + milliseconds + "ms ";
            } else if (milliseconds > 0) {
                return milliseconds + "ms ";
            } else {
                return interaction.client.getWordLanguage(serverSettings.lang, 'AVAILABLE');
            }
        }
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            var todayDate = new Date();
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
            let millLeft = interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NEW_IN_A')
            if (userCDData[0] !== undefined) {
                userCDData = userCDData[0];
                if (userCDData.quest !== 'null') {
                    let timeLeft = msToTimeReady(interaction.client.strToDate(userCDData.quest).getTime() - todayDate.getTime());
                    if (timeLeft !== interaction.client.getWordLanguage(serverSettings.lang, 'AVAILABLE')) {
                        millLeft = interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NEW').format(timeLeft);
                    }
                }
            }

            if (interaction.options.getSubcommand() === "info") {
                let questData = await interaction.client.databaseSelectData("select * from created_quest where user_id =?", [interaction.user.id]);
                if (questData[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                } else {
                    questData = questData[0];
                    let txtToDo = "⦿ ";
                    let completed = false;
                    // if (questData.type === "Q Gather")
                    //     txtToDo += "['ALL THE DROPS WILL BE CONSUMED']\n"

                    txtToDo += questData.todo.replaceAll(';', "\n⦿ ")
                    if (questData.status === "completed")
                        completed = true;
                    let embed;
                    if (completed) {
                        embed = new MessageEmbed()
                            .setAuthor({ name: `${interaction.user.username} ${interaction.client.getWordLanguage(serverSettings.lang, "QUEST_COMPLETED")}`, iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: interaction.client.getWordLanguage(serverSettings.lang, "QUEST_INFO"), value: interaction.client.getWordLanguage(serverSettings.lang, "QUEST_COMPLETED_INFO").format(questData.type, questData.gold, questData.exp) }
                            )
                            .setColor('#0x14e188')
                            .setThumbnail("https://i.imgur.com/RBt8b5B.gif");
                    } else {
                        embed = new MessageEmbed()
                            .setAuthor({ name: `${interaction.user.username} ${interaction.client.getWordLanguage(serverSettings.lang, "QUEST")}`, iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: interaction.client.getWordLanguage(serverSettings.lang, "QUEST_INFO"), value: interaction.client.getWordLanguage(serverSettings.lang, "QUEST_FULL_INFO").format(questData.type, questData.gold, questData.exp, txtToDo, msToTime(interaction.client.strToDate(questData.date) - todayDate.getTime())) }
                            )
                            .setColor('#0xffff00')
                            .setThumbnail("https://i.imgur.com/RBt8b5B.gif");
                    }
                    embed.setFooter({ text: millLeft });
                    return await interaction.editReply({ embeds: [embed] })
                }
            } else if (interaction.options.getSubcommand() === "new") {
                if (millLeft === interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NEW_IN_A')) {
                    let newQuestCd = 8
                    var tempDate = new Date();
                    tempDate.setTime(tempDate.getTime() + (newQuestCd * 60 * 60 * 1000))
                    var dateStr =
                        ("00" + tempDate.getDate()).slice(-2) + "/" +
                        ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                        tempDate.getFullYear() + " " +
                        ("00" + tempDate.getHours()).slice(-2) + ":" +
                        ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                        ("00" + tempDate.getSeconds()).slice(-2);
                    await interaction.client.databaseEditData("update user_cd set quest = ? where user_id = ?", [dateStr, interaction.user.id])
                    await userDailyLogger(interaction, interaction.user, "quest", `New quest Created at [${tempDate}]`)
                    var data = await fetch(`https://obelisk.club/create_quest.php?id=${interaction.user.id}&time=${dateStr}`, {
                        method: 'POST'
                    })
                        .then(response => response.text())
                        .then(data => { return data });
                    return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NEW_CREATED'))] });
                } else {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(millLeft, interaction.client.getWordLanguage(serverSettings.lang, 'COMMAND_CD_TITLE'))] });
                }
            } else if (interaction.options.getSubcommand() === "board") {
                let searchById = interaction.options.getNumber("id");
                let questsData;
                let pagginateData = []
                if (searchById === null) {
                    questsData = await interaction.client.databaseSelectData("select * from quest_board")
                } else {
                    questsData = await interaction.client.databaseSelectData("select * from quest_board where id = ?", [searchById]);
                }

                if (questsData[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_NF_ID'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] })
                }

                for (let i = 0; i < questsData.length; i++) {
                    pagginateData.push(interaction.client.getWordLanguage(serverSettings.lang, "QUEST_BOARD").format(questsData[i].id, questsData[i].type, questsData[i].honor, questsData[i].gold, questsData[i].exp, questsData[i].time, questsData[i].todo.replaceAll(';', "\n⦿ ")))
                }
                var maxPages = pagginateData.length;

                var embed = interaction.client.bluePagesEmbed(pagginateData[0], interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_BOARD_TITLE'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, pagginateData, questsData, msg);
                } else {
                    await interaction.editReply({ embeds: [embed], components: [rowBuy] });
                }
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

function buttonHandler(userInfo, interaction, serverSettings, pagginateData, questsData, msg) {
    let index = 0;
    var maxPages = pagginateData.length - 1;

    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
        await i.defferUpdate();
        if (i.user.id !== interaction.user.id) return;

        if (["left", "right"].includes(i.customId)) {
            collector.resetTimer({ time: 15000 });
            if (i.customId === 'left')
                index--;
            else if (i.customId === 'right')
                index++;
            if (index > maxPages)
                index = 0;
            if (index < 0)
                index = maxPages;
            var embed = interaction.client.bluePagesEmbed(pagginateData[index], interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_BOARD_TITLE'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
            await interaction.editReply({ embeds: [embed], components: [row] });
        } else if (i.customId === 'buy') {
            if (userInfo.honor < questsData[index].honor) {
                return await interaction.followUp({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_HONOR').format(questsData[index].honor), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            } else {
                await interaction.client.databaseEditData("update users set honor = honor - ? where user_id = ?", [questsData[index].honor, interaction.user.id])
                await interaction.client.databaseEditData("delete from created_quest where user_id = ?", [interaction.user.id])
                let newQuestCd = questsData[index].time
                var tempDate = new Date();
                tempDate.setTime(tempDate.getTime() + (newQuestCd * 60 * 60 * 1000))
                var dateStr =
                    ("00" + tempDate.getDate()).slice(-2) + "/" +
                    ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                    tempDate.getFullYear() + " " +
                    ("00" + tempDate.getHours()).slice(-2) + ":" +
                    ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                    ("00" + tempDate.getSeconds()).slice(-2);
                await interaction.client.databaseEditData("insert into created_quest (user_id, type, todo, gold, exp, date) values (?, ?, ?, ?, ?, ?)", [interaction.user.id, questsData[index].type, questsData[index].todo, questsData[index].gold, questsData[index].exp, dateStr]);
                return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_BOUGHT'))], components: [] });
            }
        }

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
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('buy')
            .setLabel('BUY')
            .setStyle('SUCCESS')
    );

const rowBuy = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('buy')
            .setLabel('BUY')
            .setStyle('SUCCESS')
    );

