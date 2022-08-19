const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment, WebhookClient } = require('discord.js');
const { createCanvas } = require('canvas')
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gather')
        .setDescription('This command is used to gather materials!'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };

        function getRandomNumberBetween(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }


        let msg = await interaction.deferReply({ fetchReply: true });
        try {

            async function generateMacroDetector(captchaData, interaction, serverSettings, msg) {
                if (captchaData === undefined) {
                    return [false, true];
                } else {
                    // check if hunt need captcha
                    if (captchaData.captcha_count > 0 && captchaData.gathering < 30) {
                        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_CAPTCHA").format("Hunt"), interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED"))] })
                        return [true, false];
                    } else if (captchaData.gathering > 30) {
                        // START MACRO DETECTOR
                        await interaction.client.databaseEditData("update macro_detector set captcha_count = captcha_count + 1 where user_id = ?", [interaction.user.id]);
                        if (captchaData.captcha_count + 1 > 4) {
                            const webhookClient = new WebhookClient({ id: process.env.webhookId, token: process.env.webhookToken });

                            const embed = new MessageEmbed()
                                .setAuthor({ name: interaction.client.user.username + " banned " + interaction.user.username, iconURL: interaction.client.user.avatarURL() })
                                .addFields(
                                    { name: "User ID:", value: `\`${interaction.user.id}\`` },
                                    { name: "Reason:", value: `\`Selected wrong captcha text\`` }
                                )
                                .setFooter({ text: "Ban Time" })
                                .setTimestamp()
                                .setColor('#0xed4245')
                                .setThumbnail(interaction.user.avatarURL());

                            webhookClient.send({
                                content: `<@!${interaction.user.id}>`,
                                username: 'Obelisk Logger',
                                embeds: [embed],
                            });
                            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_BAN").format(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED")), interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED"))] })
                            await interaction.client.databaseEditData("insert into ban_list (user_id, ban_by, reason) values (?, ?, ?)", [interaction.user.id, `735090182893862954`, "Captcha validation failed. You have selected the wrong captcha text."])

                            return [true, false];
                        }
                        const width = 500
                        const height = 80
                        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

                        const canvas = createCanvas(width, height)
                        const context = canvas.getContext('2d')
                        context.fillStyle = '#00000'
                        context.fillRect(0, 0, width, height)

                        async function generateString(length) {
                            let result = ' ';
                            const charactersLength = characters.length;
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                            }

                            return result;
                        }

                        const text = await generateString(8);
                        const textWidth = context.measureText(text).width
                        context.fillRect(600 - textWidth / 2 - 10, 170 - 5, textWidth + 20, 120)
                        context.textBaseline = 'middle';
                        context.font = 'bold 20px Arial'
                        context.textAlign = 'center'
                        context.fillStyle = '#fff'
                        context.fillText(text, 250, 40)

                        const attachment = new MessageAttachment(canvas.toBuffer(), 'Never_gonna_give_you_up_Never_gonna_let_you_down_Never_gonna_run_around_and_desert_you_Never_gonna_make_you_cry_Never_gonna_say_goodbye_Never_gonna_tell_a_lie_and_hurt_you.png');

                        const max_options = 5;

                        var options = []

                        var rightAnswerIndex = getRandomNumberBetween(0, 4)

                        for (var i = 0; i < max_options; i++) {
                            if (i !== rightAnswerIndex) {
                                var tempData = await generateString(8);
                                options.push({
                                    label: tempData,
                                    value: tempData
                                })
                            } else {
                                options.push({
                                    label: text,
                                    value: text
                                })
                            }
                        }

                        const row = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                    .setCustomId('select')
                                    .setPlaceholder('Nothing selected')
                                    .addOptions(options),
                            );


                        var textToEmbed = new MessageEmbed()
                            .setColor('0x009dff')
                            .setAuthor({ name: "Macro Detector", iconURL: interaction.user.avatarURL() })
                            .setImage('attachment://Never_gonna_give_you_up_Never_gonna_let_you_down_Never_gonna_run_around_and_desert_you_Never_gonna_make_you_cry_Never_gonna_say_goodbye_Never_gonna_tell_a_lie_and_hurt_you.png')
                            .setDescription(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_MSG"))


                        interaction.editReply({ embeds: [textToEmbed], components: [row], files: [attachment] });

                        let selected = false;

                        const collector = msg.createMessageComponentCollector({ time: 25000 });

                        let collectorRunning = true;
                        var array = [];

                        collector.on('collect', async i => {
                            await i.defferUpdate();
                            if (i.user.id !== interaction.user.id) return;

                            selected = true;
                            if (i.values[0] !== text) {
                                selected = true;

                                await userDailyLogger(interaction, interaction.user, "captcha", `Selected wrong captcha on Gathering. Selected [${i.values[0]}] instead of [${text}]`);
                                await interaction.editReply({
                                    embeds: [interaction.client.redEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED"), interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED_TITLE"), i.user)], components: [], files: []
                                });
                                collector.stop();
                                if (captchaData.captcha_count + 1 > 4) {
                                    const webhookClient = new WebhookClient({ id: process.env.webhookId, token: process.env.webhookToken });

                                    const embed = new MessageEmbed()
                                        .setAuthor({ name: interaction.client.user.username + " banned " + interaction.user.username, iconURL: interaction.client.user.avatarURL() })
                                        .addFields(
                                            { name: "User ID:", value: `\`${interaction.user.id}\`` },
                                            { name: "Reason:", value: `\`Selected wrong captcha text\`` }
                                        )
                                        .setFooter({ text: "Ban Time" })
                                        .setTimestamp()
                                        .setColor('#0xed4245')
                                        .setThumbnail(interaction.user.avatarURL());

                                    webhookClient.send({
                                        content: `<@!${interaction.user.id}>`,
                                        username: 'Obelisk Logger',
                                        embeds: [embed],
                                    });
                                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_BAN").format(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED")), interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED"))] })
                                    await interaction.client.databaseEditData("insert into ban_list (user_id, ban_by, reason) values (?, ?, ?)", [interaction.user.id, `735090182893862954`, "Captcha validation failed. You have selected the wrong captcha text."])
                                }
                                array = [true, false];

                            } else {
                                selectedRightCapthca = true;
                                captchaRequired = false;
                                await interaction.client.databaseEditData("update macro_detector set captcha_count = 0, gathering = 0 where user_id = ?", [interaction.user.id]);
                                await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_SUCCESSFUL"), interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_SUCCESSFUL_TITLE"), i.user)], components: [], files: [] })
                                collector.stop();
                                array = [true, true];
                            }
                        });
                        collector.on('end', async collected => {
                            collectorRunning = false;
                            if (!selected) {
                                selectedRightCapthca = false;
                                await userDailyLogger(interaction, interaction.user, "captcha", `Failed. Timeout!`);
                                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_I_TIMEOUT'))], components: [], files: [] });
                                array = [true, false];
                            }
                        });

                        while (collectorRunning) {
                            await new Promise(r => setTimeout(r, 1000));
                        }

                        return array;
                    } else {
                        return [false, true];
                    }
                }

            }

            var date = new Date();

            // check if user on a fight:
            if (userInfo.boss_fight !== '0') {
                // check last hunt lock time 
                let elapsedTimeFromHuntLock = Math.floor((date.getTime() - interaction.client.strToDate(userInfo.boss_fight).getTime()));
                if (elapsedTimeFromHuntLock < 1140000) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_FIGHTING"), interaction.client.getWordLanguage(serverSettings.lang, "LOCKED"))] });
                }
            }

            var userCD = await interaction.client.databaseSelectData("select * from user_cd where user_id = ?", [interaction.user.id]);
            var userOnCD = true;
            var userCDTimeLeft = 0;
            var commandCDTimeSec = 120;
            var interactionReplied = false;
            var selectedRightCapthca = false;
            var addedSleepTime = 0;
            var captchaTimeout = false;
            var dateStr = ""
            var collectorFilter;
            var collector;
            var continueCode = true;

            // check if user is a donator
            // patreon
            const donatorData = await interaction.client.databaseSelectData("select * from patreon_donators where user_id = ?", [interaction.user.id]);

            if (donatorData[0] !== undefined) {
                if (donatorData[0]["donation_rank"] > 2) {
                    commandCDTimeSec = Math.floor(commandCDTimeSec * 0.8);
                }
            }

            if (userCD[0] === undefined) {
                var tempDate = new Date();
                tempDate.setSeconds(tempDate.getSeconds() + commandCDTimeSec);
                dateStr =
                    ("00" + tempDate.getDate()).slice(-2) + "/" +
                    ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                    date.getFullYear() + " " +
                    ("00" + tempDate.getHours()).slice(-2) + ":" +
                    ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                    ("00" + tempDate.getSeconds()).slice(-2);
                await interaction.client.databaseEditData("insert into user_cd (user_id, gathering) values(?, ?)", [interaction.user.id, dateStr])
                userOnCD = false;
            } else {
                if (userCD[0].gathering !== 'null') {
                    let elapsedTimeFromHunt = Math.floor((interaction.client.strToDate(userCD[0].gathering).getTime() - date.getTime()) / 1000);
                    // check remaining time 
                    if (elapsedTimeFromHunt > 0) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_P").format(" `" + (elapsedTimeFromHunt) + "`s", "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Gathering"))], ephemeral: true });;
                    }
                }
            }

            // check if on captcha
            var captchaRequired = true;
            var captchaData = await interaction.client.databaseSelectData("select * from macro_detector where user_id = ?", [interaction.user.id]);
            captchaData = captchaData[0]

            var captchaReturn = await generateMacroDetector(captchaData, interaction, serverSettings, msg);
            if (captchaReturn !== undefined) {
                interactionReplied = captchaReturn[0];
                selectedRightCapthca = captchaReturn[1];
                if (selectedRightCapthca) {

                    var areaInfo = await interaction.client.databaseSelectData("select * from area where tag = ?", [userInfo.area_tag.replaceAll(" ", "_")]);

                    var availableMaterials = areaInfo[0].materials.split(';');

                    var foundMaterials = [];
                    var foundMaterialsString = "";

                    var currentMaterial = [];
                    var currentMaterialName = "";
                    var currentMaterialQuantity = [];
                    var quantity = 0;

                    for (var i = 0; i < getRandomNumberBetween(1, availableMaterials.length); i++) {
                        currentMaterial = availableMaterials[i].split("-");
                        currentMaterialName = currentMaterial[0];
                        currentMaterialQuantity = currentMaterial[1].split(',');

                        quantity = getRandomNumberBetween(parseInt(currentMaterialQuantity[0]), parseInt(currentMaterialQuantity[1]));

                        if (quantity > 0) {
                            foundMaterials.push([currentMaterialName, quantity]);
                            foundMaterialsString += `; ${currentMaterialName.replaceAll('_', ' ')} - ${quantity}`
                        }

                    }

                    if (foundMaterialsString.length < 0) {
                        foundMaterialsString = "1" + interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_UNLUCKY');
                    }

                    await userDailyLogger(interaction, interaction.user, "gathering", `Materials Found -> [${foundMaterialsString.substring(1)}]`);

                    for (var i = 0; i < foundMaterials.length; i++) {
                        await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, foundMaterials[i][0], foundMaterials[i][1], foundMaterials[i][1]])
                    }
                    if (interaction.replied) {
                        await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "FOUND_MATERIALS") + "\n```css\n" + foundMaterialsString.substring(1) + "```", interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_COMPLETED"), interaction.user)] })
                    } else {
                        await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "FOUND_MATERIALS") + "\n```css\n" + foundMaterialsString.substring(1) + "```", interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_COMPLETED"), interaction.user)] })
                    }

                    var tempDate = new Date();
                    tempDate.setSeconds(tempDate.getSeconds() + commandCDTimeSec);
                    dateStr =
                        ("00" + tempDate.getDate()).slice(-2) + "/" +
                        ("00" + (tempDate.getMonth() + 1)).slice(-2) + "/" +
                        tempDate.getFullYear() + " " +
                        ("00" + tempDate.getHours()).slice(-2) + ":" +
                        ("00" + tempDate.getMinutes()).slice(-2) + ":" +
                        ("00" + tempDate.getSeconds()).slice(-2);

                    await interaction.client.databaseEditData("update user_cd set gathering = ? where user_id = ?", [dateStr, interaction.user.id]);

                    // check task 
                    let userTask = await interaction.client.databaseSelectData("select * from task where user_id = ?", [interaction.user.id]);
                    userTask = userTask[0];
                    let taskResetDone = false;
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

                    let elapsedTimeFromHunt = 0;

                    if (userTask.time !== "None") {
                        elapsedTimeFromHunt = Math.floor((interaction.client.strToDate(userTask.time).getTime() - date.getTime()));
                        // check remaining time 
                        if (elapsedTimeFromHunt < 1) {
                            // reset task
                            taskResetDone = true;
                            await interaction.client.databaseEditData("update task set daily = 0, vote_bot= 0, hunt = 0, gathering = 1, status = 'open', time = ? where user_id = ?", [dateStr, interaction.user.id]);
                            // log
                            userDailyLogger(interaction, interaction.user, "task", "New Task started!");
                            userTask = {
                                daily: 0,
                                vote_bot: 0,
                                hunt: 0,
                                gathering: 1,
                                status: "open",
                                time: tomorrow
                            }
                        }
                    }

                    if (!taskResetDone && userTask.status !== "completed") {
                        userTask.gathering += 1;

                        // check if completed all tasks
                        if (userTask.daily > 0 && userTask.vote_bot > 0 && userTask.hunt > 9 && userTask.gathering > 9) {
                            await interaction.followUp({ embeds: [interaction.client.greenEmbed(`**${interaction.client.getWordLanguage(serverSettings.lang, 'TASKS_COMPLETED')}**`)] });
                            await interaction.client.databaseEditData("update task set gathering = gathering + 1, status = 'completed' where user_id = ?", [interaction.user.id]);
                            await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, "Aurora", 1, 1])
                            userDailyLogger(interaction, interaction.user, "task", "Task completed!");
                        } else {
                            await interaction.client.databaseEditData("update task set gathering = gathering + 1 where user_id = ?", [interaction.user.id]);
                        }
                    }

                    // check if reminder Enabled

                    var userSettings = await interaction.client.databaseSelectData("select * from user_settings where user_id = ?", [interaction.user.id]);

                    if (userSettings[0] === undefined) {
                        userSettings = {
                            h_reminder: "disabled",
                            g_reminder: "disabled"
                        }
                        await interaction.client.databaseEditData("insert into user_settings (user_id) values (?)", [interaction.user.id]);
                    } else {
                        userSettings = userSettings[0];
                    }

                    if (userSettings.g_reminder === "enabled") {
                        await new Promise(r => setTimeout(r, commandCDTimeSec * 1000));
                        await interaction.followUp({ content: `<@${interaction.user.id}>`, embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'GATHERING_READY'))], ephemeral: true })
                    }
                }
            }


        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}