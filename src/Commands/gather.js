const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { createCanvas } = require('canvas')
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');

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



        // try {

        async function generateMacroDetector(captchaData, interaction, serverSettings) {
            if (captchaData === undefined) {
                return [false, true];
            } else {
                // check if hunt need captcha
                if (captchaData.captcha_count > 0 && captchaData.gathering < 30) {
                    await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_CAPTCHA").format("Hunt"), interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED"))] })
                    return [true, true];
                } else if (captchaData.gathering > 30) {
                    // START MACRO DETECTOR
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
                        .setAuthor("Macro Detector", interaction.user.avatarURL())
                        .setImage('attachment://Never_gonna_give_you_up_Never_gonna_let_you_down_Never_gonna_run_around_and_desert_you_Never_gonna_make_you_cry_Never_gonna_say_goodbye_Never_gonna_tell_a_lie_and_hurt_you.png')
                        .setDescription(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_MSG"))


                    interaction.reply({ embeds: [textToEmbed], components: [row], files: [attachment] });

                    const filter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
                    let selected = false;

                    const collector = await interaction.channel.createMessageComponentCollector({ filter, time: 25000 });

                    let collectorRunning = true;
                    var array = [];

                    collector.on('collect', async i => {
                        selected = true;
                        if (i.values[0] !== text) {
                            selected = true;
                            await interaction.client.databaseEditData("update macro_detector set captcha_count = captcha_count + 1 where user_id = ?", [interaction.user.id]);
                            await userDailyLogger(interaction, "captcha", `Selected wrong captcha on Gathering. Selected [${i.values[0]}] instead of [${text}]`);
                            await interaction.editReply({
                                embeds: [interaction.client.redEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED"), interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED_TITLE"), i.user)], components: [], files: []
                            });
                            collector.stop();
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
                            await interaction.client.databaseEditData("update macro_detector set captcha_count = captcha_count + 1 where user_id = ?", [interaction.user.id]);
                            await interaction.editReply({ embeds: [interaction.client.redEmbed("**Interaction time out**")], components: [], files: [] });
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
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_FIGHTING"), interaction.client.getWordLanguage(serverSettings.lang, "LOCKED"))] });
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
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_P").format(" `" + (elapsedTimeFromHunt) + "`s", "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Gathering"))], ephemeral: true });;
                }
            }
        }

        // check if on captcha
        var captchaRequired = true;
        var captchaData = await interaction.client.databaseSelectData("select * from macro_detector where user_id = ?", [interaction.user.id]);
        captchaData = captchaData[0]

        var captchaReturn = await generateMacroDetector(captchaData, interaction, serverSettings);
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

                await userDailyLogger(interaction, "gathering", `Materials Found -> [${foundMaterialsString.substring(1)}]`);

                for (var i = 0; i < foundMaterials.length; i++) {
                    await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, foundMaterials[i][0], foundMaterials[i][1], foundMaterials[i][1]])
                }
                if (interaction.replied) {
                    await interaction.editReply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "FOUND_MATERIALS") + "\n```css\n" + foundMaterialsString.substring(1) + "```", interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_COMPLETED"), interaction.user)] })
                } else {
                    await interaction.reply({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "FOUND_MATERIALS") + "\n```css\n" + foundMaterialsString.substring(1) + "```", interaction.client.getWordLanguage(serverSettings.lang, "GATHERING_COMPLETED"), interaction.user)] })
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
            }
        }


        // } catch (error) {
        //     if (interaction.replied) {
        //         await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        //     } else {
        //         await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        //     }
        //     errorLog.error(error.message, { 'command_name': interaction.commandName });
        // }
    }
}