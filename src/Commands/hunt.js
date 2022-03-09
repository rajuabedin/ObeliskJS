const Command = require('../Structures/Command.js');
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const errorLog = require('../Utility/logger').logger;
const { createCanvas } = require('canvas')
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Hunt a monster!')
        .addStringOption(option =>
            option.setName('extras')
                .setDescription('Hunt extras')
                .addChoice('info', 'info')
                .setRequired(false)),

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

        async function generateMacroDetector(captchaData, interaction, serverSettings) {
            if (captchaData === undefined) {
                return [false, true];
            } else {
                // check if gathering need captcha
                if (captchaData.captcha_count > 0 && captchaData.hunt < 30) {
                    await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED_GATHERING_CAPTCHA"), interaction.client.getWordLanguage(serverSettings.lang, "CM_LOCKED"))] })
                    return [true, true];
                } else if (captchaData.hunt > 30) {
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
                            await userDailyLogger(interaction, "captcha", `Selected wrong captcha on Hunt. Selected [${i.values[0]}] instead of [${text}]`);
                            await interaction.editReply({
                                embeds: [interaction.client.redEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED"), interaction.client.getWordLanguage(serverSettings.lang, "CAPTCHA_FAILED_TITLE"), i.user)], components: [], files: []
                            });
                            collector.stop();
                            array = [true, false];

                        } else {
                            selectedRightCapthca = true;
                            captchaRequired = false;
                            await interaction.client.databaseEditData("update macro_detector set captcha_count = 0, hunt = 0 where user_id = ?", [interaction.user.id]);
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


        try {
            var date = new Date();

            // check if user on a fight:
            if (userInfo.boss_fight !== '0') {
                // check last hunt lock time 
                let elapsedTimeFromHuntLock = Math.floor((date.getTime() - interaction.client.strToDate(userInfo.boss_fight).getTime()));
                if (elapsedTimeFromHuntLock < 1140000) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_FIGHTING"), interaction.client.getWordLanguage(serverSettings.lang, "LOCKED"))] });
                }
            }

            var extras = interaction.options.getString('extras');
            var showLog = false;

            if (extras === "info") showLog = true;

            // check cd 
            var userCD = await interaction.client.databaseSelectData("select * from user_cd where user_id = ?", [interaction.user.id]);
            var userOnCD = true;
            var userCDTimeLeft = 0;
            var commandCDTimeSec = 60;
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


            if (userCD[0] === undefined) {
                dateStr =
                    ("00" + date.getDate()).slice(-2) + "/" +
                    ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
                    date.getFullYear() + " " +
                    ("00" + date.getHours()).slice(-2) + ":" +
                    ("00" + date.getMinutes()).slice(-2) + ":" +
                    ("00" + date.getSeconds()).slice(-2);
                await interaction.client.databaseEditData("insert into user_cd (user_id, hunt) values(?, ?)", [interaction.user.id, dateStr])
                userOnCD = false;
            } else {
                if (userCD[0].hunt !== 'null') {
                    let elapsedTimeFromHunt = Math.floor((interaction.client.strToDate(userCD[0].hunt).getTime() - date.getTime()) / 1000);







                    if (donatorData[0] !== undefined) {
                        if (donatorData[0]["donation_rank"] > 2) {
                            commandCDTimeSec = Math.floor(commandCDTimeSec * 0.8);
                        }
                    }


                    // check remaining time 
                    if (commandCDTimeSec + elapsedTimeFromHunt > 0) {
                        return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_P").format(" `" + (commandCDTimeSec + elapsedTimeFromHunt) + "`s", "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Hunt"))], ephemeral: true });;
                    }
                }

                userOnCD = false;
            }

            if (userOnCD) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_P").format(" `" + (commandCDTimeSec + elapsedTimeFromHunt) + "`s", "https://www.patreon.com/obelisk_rpg1"), interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_CD_T").format("Hunt"))], ephemeral: true });
            }

            await userDailyLogger(interaction, "hunt", "Hunt Started")

            //await interaction.reply({ embeds: [interaction.client.blueEmbed("Request recieved.")] })

            // check if on captcha
            var captchaRequired = true;
            var captchaData = await interaction.client.databaseSelectData("select * from macro_detector where user_id = ?", [interaction.user.id]);
            captchaData = captchaData[0]

            var captchaReturn = await generateMacroDetector(captchaData, interaction, serverSettings);
            if (captchaReturn !== undefined) {
                interactionReplied = captchaReturn[0];
                selectedRightCapthca = captchaReturn[1];
                if (selectedRightCapthca) {

                    // check death protection 
                    var userBuffsData = await interaction.client.databaseSelectData("select * from buff where user_id = ?", [interaction.user.id]);
                    userBuffsData = userBuffsData[0];
                    var deathHuntCount = 0;
                    var newHuntCount = 0;

                    if (userBuffsData !== undefined) {
                        deathHuntCount = userBuffsData.death_protection;

                        if (deathHuntCount > 0) {
                            newHuntCount = deathHuntCount - 1;
                            if (newHuntCount < 0) {
                                newHuntCount = 0;
                            }
                            // user death protection expires after this hunt
                            if (newHuntCount === 0) {
                                if (interactionReplied) {
                                    await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_END"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))] })
                                    await new Promise(r => setTimeout(r, 2000));
                                } else {
                                    await interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_END"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))] })
                                    await new Promise(r => setTimeout(r, 2000));
                                }
                            }
                            await interaction.client.databaseEditData("update buff set death_protection = ? where user_id = ?", [newHuntCount, interaction.user.id]);
                        }

                        if (deathHuntCount === -1) {
                            var deathProtectionTimeLeft = Math.floor(((userBuffsData.d_date.getTime() + 17280000) - date.getTime()) / 1000)
                            if (deathProtectionTimeLeft < 0) {
                                let awaitConfirmation = true;

                                if (interactionReplied) {
                                    await interaction.editReply({
                                        embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_EXPIRED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [rowYesNo]
                                    })
                                } else {
                                    interactionReplied = true;
                                    await interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_EXPIRED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [rowYesNo] })
                                }

                                collectorFilter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
                                collector = interaction.channel.createMessageComponentCollector({ collectorFilter, time: 15000 });

                                collector.on('collect', async i => {
                                    if (i.customId === "yes") {
                                        continueCode = true;
                                    } else {
                                        return await interaction.editReply({
                                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "HUNT_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                                        })
                                    }
                                    collector.stop();
                                });

                                collector.on('end', async i => {
                                    awaitConfirmation = false;
                                });

                                while (awaitConfirmation) {
                                    await new Promise(r => setTimeout(r, 1000));
                                }

                            }


                        }

                    } else {
                        await interaction.client.databaseEditData("inster into buff (user_id) values (?)", [interaction.user.id]);
                    }
                    if (!continueCode) {
                        return
                    }
                    // set user fighting
                    date = new Date();
                    dateStr =
                        ("00" + date.getDate()).slice(-2) + "/" +
                        ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
                        date.getFullYear() + " " +
                        ("00" + date.getHours()).slice(-2) + ":" +
                        ("00" + date.getMinutes()).slice(-2) + ":" +
                        ("00" + date.getSeconds()).slice(-2)
                    await interaction.client.databaseEditData("update users set boss_fight = ? where user_id = ?", [dateStr, interaction.user.id]);

                    // generate monster

                    const allMonsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ?", [userInfo.area_tag.replaceAll(' ', '_')]);

                    percentage = [];
                    allMonsters.forEach((monster) => {
                        if (monster.rarity == 'Common') {
                            percentage.push(80)
                        }
                        else if (monster.rarity == 'Uncommon') {
                            percentage.push(30)
                        }
                        else if (monster.rarity == 'Rare') {
                            percentage.push(5)
                        }
                        else if (monster.rarity == 'Leggendary') {
                            percentage.push(2)
                        }
                        else if (monster.rarity == 'God Like') {
                            percentage.push(0.5)
                        }
                        else if (monster.rarity == 'Boss') {
                            percentage.push(0)
                        };

                    })

                    var monsterLvl = 0;
                    var monsterHP = 0;
                    var monsterATK = 0;
                    var monsterGold = 0;
                    var monsterExp = 0;
                    var monsterDrops = [];
                    var monsterDropsPercentage = [];
                    var monsterFoundDropsName = []
                    var monsterFoundDropsQuantity = []
                    var monsterDMGMultiplier = 1;
                    var monsterDodgeRate = 0;

                    var monsterRankEmoji = "<a:common:738785981100195880>";


                    // user stats

                    var accuracy = (userInfo.dex - userInfo.lvl);

                    // (int(ainfo['dex']) - int(data['lvl'])) * (
                    //     int(ainfo['level']) / int(data['lvl']));
                    var agi = userInfo.agi;
                    var str = userInfo.str;
                    var dex = userInfo.dex;
                    var vit = userInfo.def;
                    var intel = userInfo.intel;
                    var atk = userInfo.attack;
                    var crit = userInfo.crit;
                    var luck = userInfo.luck;

                    var playerMaxDmg = 0;
                    var playerDodgeRate = 0;
                    var playerCritRate = 0;

                    var userLvl = userInfo.level;

                    var playerHP = userInfo.current_hp;
                    var playerMP = userInfo.current_mp;




                    // familiar stats
                    if (!['none', ''].includes(userInfo.pet_id)) {
                        var petInfo = interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                        petInfo = petInfo[0];;
                        if (petInfo !== undefined) {
                            if (petInfo.happiness > 50) {
                                var petStatData = petInfo.stat.split("-");
                                if (petStatData[0] === "agi") {
                                    agi += parseInt(petStatData[1])
                                } else if (petStatData[0] === "str") {
                                    str += parseInt(petStatData[1])
                                } else if (petStatData[0] === "dex") {
                                    dex += parseInt(petStatData[1])
                                } else if (petStatData[0] === "vit") {
                                    vit += parseInt(petStatData[1])
                                } else if (petStatData[0] === "intel") {
                                    intel += parseInt(petStatData[1])
                                } else if (petStatData[0] === "atk") {
                                    atk += parseInt(petStatData[1])
                                } else if (petStatData[0] === "crit") {
                                    crit += parseInt(petStatData[1])
                                } else {
                                    luck += parseInt(petStatData[1])
                                }

                            } else {
                                await userDailyLogger(interaction, "familiar", "Familiar Unequipped low happiness")
                                await interaction.client.databaseEditData("update users set pet_id = 'null' where user_id = ?", [interaction.user.id])
                                if (interactionReplied) {
                                    await interaction.editReply({
                                        embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                                    })
                                } else {
                                    interactionReplied = true;
                                    await interaction.reply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [] })
                                }
                                await new Promise(r => setTimeout(r, 2000));
                            }
                        }
                    }

                    // generate monster
                    var selectedMonster = weightedRandom(allMonsters, percentage).item;
                    if (userLvl <= 3) {
                        monsterLvl = getRandomNumberBetween(userLvl + 1, userLvl + 2);
                    } else {
                        monsterLvl = getRandomNumberBetween(selectedMonster.min_lvl, selectedMonster.max_lvl);
                    }

                    if (selectedMonster.rarity === "Uncommon") {
                        monsterRankEmoji = "<a:uncommon:738785981150396426>"
                    } else if (selectedMonster.rarity === "Rare") {
                        monsterRankEmoji = "<a:rare:738783439125348412>"
                    } else if (selectedMonster.rarity === "God Like") {
                        monsterRankEmoji = "<a:god_like:738785980999532604>"
                    } else if (selectedMonster.rarity === "Boss") {
                        monsterRankEmoji = "<a:boss:738786415512387644>"
                    }

                    monsterHP = Math.ceil(selectedMonster.hp + ((selectedMonster.hp * 0.7) * monsterLvl));
                    monsterGold = getRandomNumberBetween((monsterHP * 0.04), (monsterHP * 0.08)) + 5;
                    monsterExp = Math.ceil(monsterHP * 0.08 * (monsterHP * 0.05 * (monsterLvl - userLvl)) / 10);
                    monsterATK = Math.ceil(selectedMonster.atk + ((selectedMonster.atk * 0.5) * monsterLvl))

                    if (monsterExp < 0) monsterExp = 0;


                    // apply boost
                    if (userBuffsData !== undefined) {
                        let tileLeftBoost = Math.floor((userBuffsData.exp_date.getTime() - date.getTime()) / 1000);
                        if (tileLeftBoost > 0) monsterExp = monsterExp * (1 + userBuffsData.exp_percentage / 100);
                    }

                    monsterDrops = selectedMonster.drop_n_q.split(';');
                    monsterDropsPercentage = selectedMonster.drop_p.split(';');


                    // generate drop_p

                    var dropChanceOptions = [false, true];
                    var dropChancePercent = [];
                    var dropFound = false;
                    var dropName = "name";
                    var dropQuantity = "quantity";
                    var dropMinQuantity = 0;
                    var dropMaxQuantity = 0;

                    var splitNameQuantiy = [];
                    var splitQuantiyMinMax = []

                    var dropString = ""

                    for (var i = 0; i < monsterDrops.length; i++) {
                        dropChancePercent = [100 - monsterDropsPercentage[i], monsterDropsPercentage[i]];
                        dropFound = weightedRandom(dropChanceOptions, dropChancePercent).item;
                        if (!dropFound) {
                            continue;
                        }
                        splitNameQuantiy = monsterDrops[i].split('-');
                        dropName = splitNameQuantiy[0];
                        dropQuantity = splitNameQuantiy[1];


                        splitQuantiyMinMax = dropQuantity.split(',');
                        dropMinQuantity = parseInt(splitQuantiyMinMax[0]);
                        dropMaxQuantity = parseInt(splitQuantiyMinMax[1]);

                        // change drop quantity values are
                        dropQuantity = getRandomNumberBetween(dropMinQuantity, dropMaxQuantity);

                        if (dropQuantity > 0) {
                            monsterFoundDropsName.push(dropName);
                            monsterFoundDropsQuantity.push(dropQuantity);
                            dropString += `; ${dropName.replaceAll('_', ' ')} - ${dropQuantity}`
                        }

                    }

                    if (monsterFoundDropsName.length < 1) {
                        dropString = "1" + interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_UNLUCKY')
                    }

                    // user max_dmg 

                    if (userInfo.class === "Mage") {
                        playerMaxDmg = Math.ceil(str * 0.5 + agi * 0.5 + dex * 0.5 + vit * 0.5 + atk + intel * 1);
                    } else if (userInfo.class === "Tank") {
                        playerMaxDmg = Math.ceil(str * 0.5 + agi * 0.5 + dex * 0.5 + vit * 1 + atk + intel * 0.5);
                    } else {
                        playerMaxDmg = Math.ceil(str * 1 + agi * 0.5 + dex * 0.5 + vit * 0.5 + atk + intel * 0.5);
                    }

                    if ((monsterLvl - userLvl) > 5) {
                        monsterDMGMultiplier = monsterLvl - userLvl;
                        playerMaxDmg = Math.ceil(playerMaxDmg * (1 - 0.07 * monsterDMGMultiplier));
                        if (playerMaxDmg < 0) {
                            playerMaxDmg = 1;
                        }
                    }

                    monsterDodgeRate = Math.ceil(55 - (dex / monsterLvl) * 30);
                    playerDodgeRate = Math.ceil(agi / monsterLvl * 42);

                    playerCritRate = Math.ceil(crit / monsterLvl * 42);

                    if (playerDodgeRate > 70) {
                        playerDodgeRate = 70;
                    }

                    if (playerCritRate > 70) {
                        playerCritRate = 70;
                    }

                    if (monsterDodgeRate < 1) {
                        monsterDodgeRate = 1;
                    }

                    var continueHunt = true;
                    var huntTurn = 0;

                    // log 
                    var huntLog = ["Hunt Started"]

                    var playerTurnDmg = 0;
                    var monsterTurnDmg = 0;
                    var playerTemTurnDmg = 0;
                    var playerTemHP = 0;
                    var playerDodged = false;
                    var monsterDodged = false;

                    var turnCrit = false;

                    var huntTurnlog = ""

                    var miss = false;

                    var levelDiff = monsterLvl - userLvl;

                    var potionUsed = 0;

                    var rage = 0;

                    var monsterMaxHp = monsterHP;

                    var monsterRunAway = false;


                    // show visual


                    const searchingEmbed = new MessageEmbed()
                        .setColor('0xe67e22')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_SEARCHING'))
                        .setImage('https://i.imgur.com/jxks0Pp.gif');

                    const foundMonsterEmbed = new MessageEmbed()
                        .setColor('0xe67e22')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_FOUND').format(monsterLvl, selectedMonster.name))
                        .setImage(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`);


                    const huntingEmbed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_STARTED'))
                        .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), `${monsterRankEmoji} ${selectedMonster.name} ${monsterLvl}`, false)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), `<:hp:740144919233953834> ${userInfo.current_hp}/${userInfo.hp}\n<:mp:740144919125164044> ${userInfo.current_mp}/${userInfo.mp}`, true)
                        .addField(interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), `<:hp:740144919233953834> ${monsterHP}/${monsterHP}\n<:rg:740144919406182421> 0/100`, true)
                        .setFooter(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_FIGHTING'), "https://i.imgur.com/SNfXuvR.gif");

                    if (interactionReplied) {
                        await interaction.editReply({
                            embeds: [searchingEmbed], components: []
                        })
                    } else {
                        interactionReplied = true;
                        await interaction.reply({ embeds: [searchingEmbed], components: [] })
                    }

                    await new Promise(r => setTimeout(r, 2000));

                    if (interactionReplied) {
                        await interaction.editReply({
                            embeds: [foundMonsterEmbed], components: []
                        })
                    } else {
                        interactionReplied = true;
                        await interaction.reply({ embeds: [foundMonsterEmbed], components: [] })
                    }

                    await new Promise(r => setTimeout(r, 2000));

                    if (interactionReplied) {
                        await interaction.editReply({
                            embeds: [huntingEmbed], components: []
                        })
                    } else {
                        interactionReplied = true;
                        await interaction.reply({ embeds: [huntingEmbed], components: [] })
                    }

                    await new Promise(r => setTimeout(r, 2000));

                    var playerDied = false;

                    var potionsToUse = 2;

                    var userHPPotionsData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, `HP_Potion_lvl_1`]);

                    userHPPotionsData = userHPPotionsData[0];

                    var potionsHP = 0;

                    while (continueHunt) {
                        if (huntTurn > 24) {
                            continueHunt = false;
                            monsterRunAway = true;
                            huntTurnlog += `\n\n<<<< ${selectedMonster.name} RUN AWAY >>>>`
                            huntLog.push(huntTurnlog);
                            break;
                        }

                        miss = false;

                        huntTurnlog = "";

                        huntTurn++;

                        huntTurnlog += `\n\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n\t\t🔪 Starting Turn [${huntTurn}] 🔪\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n`;

                        playerTurnDmg = Math.ceil(getRandomNumberBetween(playerMaxDmg * 0.8, playerMaxDmg));

                        monsterTurnDmg = Math.ceil(getRandomNumberBetween(monsterATK * 0.85, monsterATK));

                        monsterTurnDmg = monsterTurnDmg * monsterDMGMultiplier;

                        playerDodged = weightedRandom([false, true], [100 - playerDodgeRate, playerDodgeRate]).item;
                        monsterDodged = weightedRandom([false, true], [100 - monsterDodgeRate, monsterDodgeRate]).item;


                        turnCrit = weightedRandom([false, true], [100 - playerCritRate, playerCritRate]).item;

                        if (turnCrit) {
                            playerTurnDmg += playerTurnDmg;
                        } else {
                        }

                        huntTurnlog += `\n${selectedMonster.name} DMG -> [${monsterTurnDmg}]\n-----------------------------------------------------\n${interaction.user.username} DODGE % -> [${playerDodgeRate}]\n${interaction.user.username} CRIT % -> [${playerCritRate}]\n${selectedMonster.name} DODGE % -> [${monsterDodgeRate}]\n-----------------------------------------------------`;


                        if (userInfo.class === "Tank" && !playerDodged && !monsterDodged && monsterLvl > userLvl) {
                            playerTemTurnDmg = Math.ceil(monsterTurnDmg * (1 - ((levelDiff * 100) / 100)));
                            playerTurnDmg += playerTemTurnDmg;
                            huntTurnlog += `\n-----------------------------------------------------\nTANK PASSIVE DMG BOOST -> [${playerTemTurnDmg}]\nNEW ${interaction.user.username} DMG -> [${playerTurnDmg}]\n-----------------------------------------------------`;
                        }

                        if (userInfo.clss === "Assassin" && playerDodged && !monsterDodged) {
                            playerTemTurnDmg = Math.ceil(playerTurnDmg * 1.5 * monsterTurnDmg) - playerTurnDmg;
                            playerTurnDmg += playerTemTurnDmg;
                            huntTurnlog += `\n-----------------------------------------------------\nASSASSIN PASSIVE DMG BOOST -> [${playerTemTurnDmg}]\nNEW ${interaction.user.username} DMG -> [${playerTurnDmg}]\n-----------------------------------------------------`;

                        }


                        huntTurnlog += `\n${interaction.user.username} attacked ${selectedMonster.name} for [${playerTurnDmg}] amout of damage.`;

                        if (monsterDodged) {
                            playerTurnDmg = 0;
                            huntTurnlog += `\n<< ${selectedMonster.name} Evaded >>`;
                        } else {
                            monsterHP -= playerTurnDmg;

                            rage += playerTurnDmg;
                            if (rage > 99) {
                                monsterTurnDmg = monsterTurnDmg * 3;
                                rage = 0;
                            }
                            if (rage > 100) {
                                rage = 100;
                            }

                            if (userInfo.class == 'Warrior') {
                                playerTemHP = playerHP + playerTurnDmg;
                                if (playerTemHP > userInfo.hp) {
                                    playerTemHP = userInfo.hp;
                                }
                                huntTurnlog += `\n-----------------------------------------------------\nWARRIOR PASSIVE HEAL -> [${playerTurnDmg}]\nOLD HP -> [${playerHP}]\nNEW HP -> [${playerTemHP}]\n-----------------------------------------------------`;
                                playerHP = playerTemHP;
                            }

                            if (monsterHP < 1) {
                                continueHunt = false;
                                huntTurnlog += `\n\t\t💀 ${selectedMonster.name} DIED 💀`;
                                huntLog.push(huntTurnlog);
                                break;
                            } else {
                                huntTurnlog += `\n>> ${selectedMonster.name} HP -> [${monsterHP}/${monsterMaxHp}] <<`;
                            }

                        }

                        huntTurnlog += `\n${selectedMonster.name} attacked ${interaction.user.username} for [${playerTurnDmg}] amout of damage.`;


                        if (playerDodged) {
                            monsterTurnDmg = 0;
                            huntTurnlog += `\n<< ${interaction.user.username} Evaded >>`;
                        } else {
                            monsterTurnDmg = monsterTurnDmg - userInfo.armor;
                            if (monsterTurnDmg < 0) {
                                monsterTurnDmg = 0;
                            }
                            huntTurnlog += `\n${interaction.user.username} ARMOR CAN SUBTRUCT [${userInfo.armor}] DMG\nNEW ${selectedMonster.name} DMG -> [${monsterTurnDmg}]`;
                            playerHP -= monsterTurnDmg;

                            if (playerHP < 1) {
                                showLog = true;
                                continueHunt = false;
                                playerDied = true;
                                huntTurnlog += `\n\t\t💀 ${interaction.user.username} DIED 💀`;
                                huntLog.push(huntTurnlog);
                                break;
                            } else {
                                huntTurnlog += `\n>> ${interaction.user.username} HP -> [${playerHP}/${userInfo.hp}] <<`;
                            }
                        }

                        // potions

                        if (Math.ceil(100 / userInfo.hp * playerHP) < 51) {
                            if (userInfo.level > 29) {
                                potionsToUse = 12;
                            }
                            huntTurnlog += `\n-----------------------------------------------------\n\t\tLOW HP\n-----------------------------------------------------`;
                            if (userHPPotionsData !== undefined && userHPPotionsData.quantity > potionsToUse) {
                                potionUsed += potionsToUse;
                                huntTurnlog += `\nPOTIONS USED IN THIS TURN -> [${potionsToUse}/${userHPPotionsData.quantity}]\nTOTAL POTIONS USED -> [${potionUsed}]`;
                                potionsHP = potionsToUse * 30;
                                playerTemHP = playerHP + potionsHP;
                                userHPPotionsData.quantity = userHPPotionsData.quantity - potionsToUse;
                                if (playerTemHP > userInfo.hp) playerTemHP = userInfo.hp;
                                playerHP = playerTemHP;
                                huntTurnlog += `\n\nADDED HP -> [${potionsHP}]\nNEW HP -> [${playerTemHP}/${userInfo.hp}]\n-----------------------------------------------------`
                            } else {
                                huntTurnlog += `\n>> NOT HP POTIONS AVAILABLE <<\n-----------------------------------------------------`;
                            }

                        }

                        huntLog.push(huntTurnlog);

                    }

                    // deduct used potions
                    await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [potionUsed, interaction.user.id, "HP_Potion_lvl_1"])

                    var huntEndEmbed = ""
                    if (!monsterRunAway && playerHP > 1) {


                        if (["", "None"].includes(userInfo.clan_tag)) {
                            await userDailyLogger(interaction, "hunt", `Hunt completed. Rewards -> EXP -> [${monsterExp}] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}] DROP/S -> [${dropString.substring(1)}]`);
                            huntEndEmbed = new MessageEmbed()
                                .setColor('0x14e188')
                                .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_COMPLETED'))
                                .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), `${monsterRankEmoji} ${selectedMonster.name} LvL${monsterLvl}`, true)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, true)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'REWARDS'), `\`\`\`css\nEXP -> [${monsterExp}] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}]\`\`\``, false)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'FOUND_MATERIALS'), `\`\`\`css\n${dropString.substring(1)}\`\`\``, false)
                                .setFooter(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_POTIONS').format(potionUsed));
                        } else {
                            await userDailyLogger(interaction, "hunt", `Hunt completed. Rewards -> EXP -> [${Math.ceil(monsterExp * 0.9)}] [${Math.ceil(monsterExp * 0.1)} for CLAN] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}] DROP/S -> [${dropString.substring(1)}]`);
                            huntEndEmbed = new MessageEmbed()
                                .setColor('0x14e188')
                                .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_COMPLETED'))
                                .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), `${monsterRankEmoji} ${selectedMonster.name} LvL${monsterLvl}`, true)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, true)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'REWARDS'), `\`\`\`css\nEXP -> [${Math.ceil(monsterExp * 0.9)}] [${Math.ceil(monsterExp * 0.1)} for CLAN] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}]\`\`\``, false)
                                .addField(interaction.client.getWordLanguage(serverSettings.lang, 'FOUND_MATERIALS'), `\`\`\`css\n${dropString.substring(1)}\`\`\``, false)
                                .setFooter(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_POTIONS').format(potionUsed));
                            monsterExp = Math.ceil(monsterExp * 0.9);
                        }

                        // check quest
                        var questData = await interaction.client.databaseSelectData("select * from created_quest where user_id = ?", interaction.user.id);
                        questData = questData[0];

                        if (questData !== undefined) {
                            if (questData.status === "open") {
                                let timeLeftQuest = Math.floor((interaction.client.strToDate(questData.date).getTime() - date.getTime()) / 1000);
                                if (timeLeftQuest > 0) {
                                    var completeTodoList = questData.todo.split(";");
                                    var todoList = [];
                                    var todoName = "";
                                    var todoReq = [];
                                    var todoMax = "";
                                    var todoCurrent = "";
                                    var tempIndex = 0;

                                    var newTodoList = [];

                                    var questCompleted = true;

                                    for (var i = 0; i < completeTodoList.length; i++) {
                                        todoList = completeTodoList[i].split(" - ");
                                        todoName = todoList[0];
                                        todoReq = todoList[1].split('/');
                                        todoMax = parseInt(todoReq[1]);
                                        todoCurrent = parseInt(todoReq[0]);
                                        if (todoCurrent < todoMax) {
                                            if (["Hunt", "Q Hunt"].includes(questData.type) && selectedMonster.name === todoName) {
                                                todoCurrent += 1;
                                            } else if (["Gather", "Q Gather"].includes(questData.type) && monsterFoundDropsName.includes(todoName)) {
                                                tempIndex = monsterFoundDropsName.indexOf(todoName);
                                                todoCurrent += monsterFoundDropsQuantity[tempIndex];
                                            }

                                            newTodoList.push(`${todoName} - ${todoCurrent}/${todoMax}`);

                                            if (todoCurrent < todoMax) {
                                                questCompleted = false;
                                            }
                                        }
                                    }

                                    if (questCompleted) {

                                        // check if donator boost applyies
                                        var donatorBoostFound = false;
                                        if (donatorData[0] === undefined) {
                                            if (userInfo.m_contract_id !== 'null') {
                                                var marriageData = await interaction.client.databaseSelectData("select * from marriage_contracts where contract_id = ?", [userInfo.m_contract_id]);
                                                marriageData = marriageData[0];
                                                if (marriageData === undefined) {
                                                    await interaction.client.databaseEditData("update users set m_contract_id = 'null' where m_contract_id = ?", [userInfo.m_contract_id]);
                                                } else {
                                                    // check if user partner is a donator
                                                    var partnerDonatorData = [];
                                                    if (marriageData.user1_id !== userInfo.user_id) {
                                                        partnerDonatorData = await interaction.client.databaseSelectData("select * from patreon_donators where user_id = ?", [marriageData.user1_id]);
                                                    } else {
                                                        partnerDonatorData = await interaction.client.databaseSelectData("select * from patreon_donators where user_id = ?", [marriageData.user2_id]);
                                                    }
                                                    if (partnerDonatorData[0] !== undefined) {
                                                        // user partner is a donator increase exp
                                                        if (4 > partnerDonatorData[0].donation_rank > 1) {
                                                            donatorBoostFound = true;
                                                            questData.exp = questData.exp * 1.05;
                                                        } else if (partnerDonatorData[0].donation_rank > 4) {
                                                            donatorBoostFound = true;
                                                            questData.exp = questData.exp * 1.1;
                                                        }
                                                    }
                                                }
                                            }

                                        } else {
                                            // user is a donator increase exp
                                            if (4 > donatorData[0].donation_rank > 1) {
                                                donatorBoostFound = true;
                                                questData.exp = questData.exp * 1.05;
                                            } else if (donatorData[0].donation_rank > 4) {
                                                donatorBoostFound = true;
                                                questData.exp = questData.exp * 1.1;
                                            }
                                        }
                                        if (donatorBoostFound) {
                                            huntLog.push(`Donator boost found, successfully increased quest exp`)
                                        }

                                        huntLog.push(`Quest completed. Rewards GOLD -> [${questData.gold}] EXP -> [${questData.exp}]`)
                                        await userDailyLogger(interaction, "quest", `Quest completed. Rewards GOLD -> [${questData.gold}] EXP -> [${questData.exp}]`);
                                        monsterExp += questData.exp;
                                        monsterGold += questData.gold;
                                        await interaction.followUp({ embeds: [interaction.client.greenEmbedImage(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_COMPLETED_REWARD').format(questData.gold, questData.exp), interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_COMPLETED'), interaction.user)] });
                                        await interaction.client.databaseEditData("update created_quest set status = ? where id = ?", ["completed", questData.id])
                                    } else {
                                        await interaction.client.databaseEditData("update created_quest set todo = ? where id = ?", [newTodoList.join(";"), questData.id])
                                    }
                                } else {
                                    await interaction.followUp({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'QUEST_EXPIRED'))] })
                                }
                            }
                        }

                        // check if level up
                        var nextLevelData = await interaction.client.databaseSelectData("select * from levels where level = ? + 1 ORDER BY level DESC LIMIT 1", [userInfo.level]);
                        nextLevelData = nextLevelData[0];


                        if (nextLevelData !== undefined) {
                            var currentExp = userInfo.exp + monsterExp;
                            if (currentExp >= nextLevelData.required_exp && userInfo.level < nextLevelData.level) {
                                levelDiff = nextLevelData.level - userInfo.level;
                                monsterExp = currentExp - nextLevelData.required_exp;
                                userInfo.free_stat_points += 2 * levelDiff;
                                userInfo.hp += 15 * levelDiff;
                                userInfo.level += levelDiff;
                                monsterFoundDropsName.push("Aurora");
                                monsterFoundDropsQuantity.push(levelDiff)
                                await userDailyLogger(interaction, "hunt", `User level updated from [${userInfo.level}] to [${userInfo.level + levelDiff}]`);
                                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'PLAYER_LEVEL_UP').format(interaction.user.username, userInfo.level + levelDiff, levelDiff))] })
                            } else {
                                monsterExp = currentExp;
                            }
                        }

                        // add gold, exp, honor
                        await interaction.client.databaseEditData("update users set gold = gold + ? , exp = ? , honor = honor + ?, free_stat_points = ?, hp = ?, current_hp = ?, current_mp = ?, level = ? where user_id = ?",
                            [monsterGold, monsterExp, monsterLvl, userInfo.free_stat_points, userInfo.hp, playerHP, playerMP, userInfo.level, interaction.user.id]);

                        // add drop reward
                        if (monsterFoundDropsName.length > 0) {
                            for (var i = 0; i < monsterFoundDropsName.length; i++) {
                                await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, monsterFoundDropsName[i], monsterFoundDropsQuantity[i], monsterFoundDropsQuantity[i]])
                            }
                        }


                    } else if (playerDied && deathHuntCount == 0) {
                        showLog = true;
                        var goldLost = userInfo.gold - Math.ceil(userInfo.gold * 0.75);
                        huntEndEmbed = new MessageEmbed()
                            .setColor('0xed4245')
                            .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_DIED').format(interaction.user.username, `${selectedMonster.name} LvL${monsterLvl}`))
                            .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                            .addField(interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST'), `\`\`\`css\nEXP -> [${userInfo.exp}] GOLD -> [${goldLost}]\`\`\``, false)
                        await userDailyLogger(interaction, "hunt", `Player Died. Penalties EXP -> [${userInfo.exp}] GOLD -> [${goldLost}]`)
                        await interaction.client.databaseEditData("update users set gold = gold - ?, exp = exp - ? where user_id = ?", [userInfo.exp, goldLost, interaction.user.id])
                    } else if (playerDied && deathHuntCount != 0) {
                        showLog = true;
                        if (deathHuntCount === -1) {
                            deathHuntCount = 0;
                            huntLog.push(`\n\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n\t\tDEATH PROTECTION **USED**\n\t\tNO PENALTIES APPLIED\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n`)
                            await interaction.client.databaseEditData("update buff set death_protection = ? where user_id = ?", [deathHuntCount, interaction.user.id]);
                        }
                        huntEndEmbed = new MessageEmbed()
                            .setColor('0xed4245')
                            .setAuthor(interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_DIED').format(interaction.user.username, `${selectedMonster.name} LvL${monsterLvl}`))
                            .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                            .addField(interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST'), `\`\`\`css\n${interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST_NONE')}\`\`\``, false)
                        await userDailyLogger(interaction, "hunt", `Player Died. Protection found, no penalties applied.`)
                    } else if (monsterRunAway && playerHP > 1) {
                        huntEndEmbed = interaction.client.redEmbed(`**${interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_MONSTER_RUN_T')}**\n${interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_MONSTER_RUN')}`)
                        await userDailyLogger(interaction, "hunt", `Monster run away.`)
                        showLog = true;
                    }





                    if (showLog) {
                        const attachment = new MessageAttachment(Buffer.from(huntLog.join("").toString(), 'utf-8'), `${interaction.user.id}-huntLog.txt`);

                        await interaction.editReply({
                            embeds: [huntEndEmbed], components: [], files: [attachment]
                        })
                    } else {
                        await interaction.editReply({
                            embeds: [huntEndEmbed], components: [], files: []
                        })
                    }

                    // update cd time on db 
                    date = new Date();
                    dateStr =
                        ("00" + date.getDate()).slice(-2) + "/" +
                        ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
                        date.getFullYear() + " " +
                        ("00" + date.getHours()).slice(-2) + ":" +
                        ("00" + date.getMinutes()).slice(-2) + ":" +
                        ("00" + date.getSeconds()).slice(-2);

                    await interaction.client.databaseEditData("update user_cd set hunt = ? where user_id = ?", [dateStr, interaction.user.id]);
                    await interaction.client.databaseEditData("update users set boss_fight = ? where user_id = ?", ["0", interaction.user.id]);
                }
            }




        } catch (error) {
            await interaction.reply({ embeds: [interaction.client.redEmbed("Please try again later.", "Error!!")], ephemeral: true });
            errorLog.error(error.message, { 'command_name': interaction.commandName });
        }

    }
}

/**
 * Picks the random item based on its weight.
 * The items with higher weight will be picked more often (with a higher probability).
 *
 * For example:
 * - items = ['banana', 'orange', 'apple']
 * - weights = [0, 0.2, 0.8]
 * - weightedRandom(items, weights) in 80% of cases will return 'apple', in 20% of cases will return
 * 'orange' and it will never return 'banana' (because probability of picking the banana is 0%)
 *
 * @param {any[]} items
 * @param {number[]} weights
 * @returns {{item: any, index: number}}
 */
function weightedRandom(items, weights) {
    if (items.length !== weights.length) {
        throw new Error('Items and weights must be of the same size');
    }

    if (!items.length) {
        throw new Error('Items must not be empty');
    }

    // Preparing the cumulative weights array.
    // For example:
    // - weights = [1, 4, 3]
    // - cumulativeWeights = [1, 5, 8]
    const cumulativeWeights = [];
    for (let i = 0; i < weights.length; i += 1) {
        cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
    }

    // Getting the random number in a range of [0...sum(weights)]
    // For example:
    // - weights = [1, 4, 3]
    // - maxCumulativeWeight = 8
    // - range for the random number is [0...8]
    const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
    const randomNumber = maxCumulativeWeight * Math.random();

    // Picking the random item based on its weight.
    // The items with higher weight will be picked more often.
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (cumulativeWeights[itemIndex] >= randomNumber) {
            return {
                item: items[itemIndex],
                index: itemIndex,
            };
        }
    }
}

const rowYesNo = new MessageActionRow()
    .addComponents(

        new MessageButton()
            .setCustomId('yes')
            .setLabel('YES')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('NO')
            .setStyle('DANGER'),
    );