const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment, UserFlags, ApplicationCommandPermissionsManager } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const utility = require('../Utility/utils');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('This command allows you to enter boss room.')
        .addStringOption(option =>
            option.setName('extras')
                .setDescription('Hunt extras')
                .addChoices(
                    { name: 'Info', value: 'info' }
                )
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

        let msg = await interaction.deferReply({ fetchReply: true });

        try {
            var date = new Date();
            // check if user on a fight:
            if (userInfo.boss_fight !== '0') {
                // check last hunt lock time 
                let elapsedTimeFromHuntLock = Math.floor((date.getTime() - interaction.client.strToDate(userInfo.boss_fight).getTime()));
                if (elapsedTimeFromHuntLock < 1140000) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "COMMAND_STOP_FIGHTING"), interaction.client.getWordLanguage(serverSettings.lang, "LOCKED"))] });
                }
            }

            var extras = interaction.options.getString('extras');
            var showLog = false;

            if (extras === "info") showLog = true;

            var mapData = await interaction.client.databaseSelectData("select min_lvl, max_lvl from area where tag = ?", [userInfo.area_tag.replaceAll(" ", "_")]);

            if (mapData[0].max_lvl - 2 > userInfo.level) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_BOSS_LEVEL").format(mapData[0].max_lvl - 2), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
            }


            var interactionReplied = false;
            var selectedRightCaptcha = false;
            var addedSleepTime = 0;
            var captchaTimeout = false;
            var dateStr = ""
            var collectorFilter;
            var collector;
            var continueCode = true;

            let keyData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, `Boss_Key_${userInfo.area_tag.replaceAll(" ", "_")}`])

            if (keyData[0] === undefined || keyData[0].quantity < 1) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_NO_BOSS_KEY"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
            }

            await userDailyLogger(interaction, interaction.user, "boos_fight", "Entered Boss Room")

            await interaction.client.databaseSelectData("update user_inventory set quantity = quantity - 1 where user_id = ? and item_name = ?", [interaction.user.id, `Boss_Key_${userInfo.area_tag.replaceAll(" ", "_")}`]);


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
                            await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_END"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))] })
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
                            await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BUFFS_DEATH_EXPIRED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [rowYesNo] })
                        }

                        collector = msg.createMessageComponentCollector({ time: 40000 });

                        collector.on('collect', async i => {
                            await i.deferUpdate();
                            if (i.user.id !== interaction.user.id) return;
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
                await interaction.client.databaseEditData("insert into buff (user_id) values (?)", [interaction.user.id]);
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
            // await interaction.client.databaseEditData("update users set boss_fight = ? where user_id = ?", [dateStr, interaction.user.id]);

            // generate monster

            let selectedMonster = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity = ?", [userInfo.area_tag.replaceAll(' ', '_'), "Boss"]);

            if (selectedMonster[0] === undefined) {
                if (interactionReplied) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_BOSS'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                } else {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_BOSS'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                }
            }

            selectedMonster = selectedMonster[0]

            var monsterName = selectedMonster.name;

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



            // user stats

            var accuracy = (userInfo.dex - userInfo.lvl);

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

            var userArmor = userInfo.armor;



            // familiar stats
            if (!['none', '', null, 'null'].includes(userInfo.pet_id)) {
                var petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
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
                        } else if (petStatData[0] === "def") {
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
                        await userDailyLogger(interaction, interaction.user, "familiar", "Familiar Unequipped low happiness")
                        await interaction.client.databaseEditData("update users set pet_id = 'none' where user_id = ?", [interaction.user.id])
                        await interaction.followUp({
                            embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [], ephemeral: true
                        })
                        await utility.updateUserStatsFamiliar(interaction, userInfo, petInfo);
                        userInfo = await interaction.client.databaseSelectData("select * from users where user_id = ?", [interaction.user.id]);
                        userInfo = userInfo[0];
                    }
                }
            }

            var playerHP = userInfo.current_hp;
            var playerMP = userInfo.current_mp;

            monsterLvl = getRandomNumberBetween(selectedMonster.min_lvl, selectedMonster.max_lvl);

            var monsterRankEmoji = "<a:boss:738786415512387644>";

            monsterHP = Math.ceil(selectedMonster.hp + ((selectedMonster.hp * 0.7) * monsterLvl));
            monsterGold = getRandomNumberBetween((monsterHP * 0.04), (monsterHP * 0.08)) + 5;
            monsterExp = Math.ceil(monsterHP * 0.08 + (monsterHP * 0.05 * (monsterLvl - userLvl)) / 10);
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

            var splitNameQuantity = [];
            var splitQuantityMinMax = []

            var dropString = ""

            for (var i = 0; i < monsterDrops.length; i++) {
                dropChancePercent = [100 - monsterDropsPercentage[i], monsterDropsPercentage[i]];
                dropFound = weightedRandom(dropChanceOptions, dropChancePercent).item;
                if (!dropFound) {
                    continue;
                }
                splitNameQuantity = monsterDrops[i].split('-');
                dropName = splitNameQuantity[0];
                dropQuantity = splitNameQuantity[1];


                splitQuantityMinMax = dropQuantity.split(',');
                dropMinQuantity = parseInt(splitQuantityMinMax[0]);
                dropMaxQuantity = parseInt(splitQuantityMinMax[1]);

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


            var playerTurnDmg = 0;
            var monsterTurnDmg = 0;
            var playerTemTurnDmg = 0;
            var playerTemHP = 0;
            var playerDodged = false;
            var monsterDodged = false;

            var turnCrit = false;

            var huntTurnLog = ""

            var levelDiff = monsterLvl - userLvl;

            var potionUsed = 0;

            var rage = 0;

            var monsterMaxHp = monsterHP;

            var monsterRunAway = false;

            const enteringRoomEmbed = new MessageEmbed()
                .setColor('0xe67e22')
                .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_ROOM_ENTER') })
                .setImage('https://i.imgur.com/KrHZW53.gif');

            const huntingEmbed = new MessageEmbed()
                .setColor('0x14e188')
                .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_HUNT') })
                .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                .addFields(
                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: `${monsterRankEmoji} ${selectedMonster.name} ${monsterLvl}`, inline: false },
                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${userInfo.current_hp}/${userInfo.hp}\n<:mp:740144919125164044> ${userInfo.current_mp}/${userInfo.mp}`, inline: true },
                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `<:hp:740144919233953834> ${monsterHP}/${monsterHP}\n<:rg:740144919406182421> 0/100`, inline: true }
                );

            if (interactionReplied) {
                await interaction.editReply({
                    embeds: [enteringRoomEmbed], components: []
                })
            } else {
                interactionReplied = true;
                await interaction.editReply({ embeds: [enteringRoomEmbed], components: [] })
            }

            await new Promise(r => setTimeout(r, 2000));

            if (interactionReplied) {
                await interaction.editReply({
                    embeds: [huntingEmbed], components: [rowFightYesNo]
                })
            } else {
                interactionReplied = true;
                await interaction.editReply({ embeds: [huntingEmbed], components: [rowFightYesNo] })
            }

            // check if gonna keep going
            awaitConfirmation = true;
            collector = msg.createMessageComponentCollector({ time: 40000 });

            let chooseToRun = true;
            let embed;
            continueCode = false;

            collector.on('collect', async i => {
                i.deferUpdate();
                if (i.user.id !== interaction.user.id) return;
                if (i.customId === "attack") {
                    continueCode = true;
                    chooseToRun = false;
                }
                collector.stop();
            });

            collector.on('end', async i => {
                awaitConfirmation = false;

                if (!continueCode && chooseToRun) {
                    await new Promise(r => setTimeout(r, 1000));
                    await interaction.client.databaseEditData("update users set gold = gold - ? where user_id = ?", [monsterGold, interaction.user.id]);
                    await userDailyLogger(interaction, interaction.user, `Boss Room - Choose to run away, cost ${monsterGold} gold`)
                    return await interaction.editReply({
                        embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "BOSS_ROOM_COST").format(monsterGold), interaction.client.getWordLanguage(serverSettings.lang, "BOSS_ROOM_COST_Q"))], components: []
                    })
                }
            });

            while (awaitConfirmation) {
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!continueCode) {
                return;
            }


            embed = new MessageEmbed()
                .setColor('0x14e188')
                .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_HUNT'), iconURL: interaction.user.avatarURL() })
                .addFields(
                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${userInfo.current_hp}/${userInfo.hp}\n<:mp:740144919125164044> ${userInfo.current_mp}/${userInfo.mp}`, inline: true },
                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `<:hp:740144919233953834> ${monsterHP}/${monsterHP}\n<:rg:740144919406182421> 0/100`, inline: true }
                )
                .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_HUNT_CHOOSE_ATK'), iconURL: interaction.client.user.avatarURL() });
            await interaction.editReply({ embeds: [embed], components: [rowSkills] })



            var huntTurnLog = ""
            let miss = false;
            let huntTurn = 0;
            let huntLog = []
            let skillUsed = false;

            let continueHunt = true;

            var playerTurnDmg = 0;
            var monsterTurnDmg = 0;
            var playerTemTurnDmg = 0;
            var playerTemHP = 0;
            var playerDodged = false;
            var monsterDodged = false;

            var levelDiff = monsterLvl - userLvl;

            var potionUsed = 0;

            var rage = 0;

            var monsterMaxHp = monsterHP;

            let tankSkill3 = [];
            let tankSkillLastAdded = 0;

            let mageCounter = 0;
            let assassinCounter = 0;
            let warriorCounter = 0;
            let tankCounter = 0;
            let mageMPIncreasePerSec = userInfo.mp * 0.15

            var userHPPotionsData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, `HP_Potion_lvl_1`]);

            userHPPotionsData = userHPPotionsData[0];

            let potionsUsed = false;
            let potionsUsedCount = 0;
            let potionsToUse = 5;

            let replied = false;

            let tempDMG = 0;
            let newCollector;
            let playerDied = false;


            while (continueHunt) {
                awaitConfirmation = true;
                newCollector = msg.createMessageComponentCollector({ time: 40000 });

                if (tankSkillLastAdded !== 0) {
                    tankSkillLastAdded = 0;
                }

                if (mageCounter > 0) {
                    mageCounter--;
                }
                if (assassinCounter > 0) {
                    assassinCounter--;
                }
                if (warriorCounter > 0) {
                    warriorCounter--;
                }
                if (tankCounter > 0) {
                    tankCounter--;
                }

                miss = false;
                skillUsed = false;

                huntTurnLog = "";

                huntTurn++;
                huntTurnLog = `\n\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n\t\t🔪 Starting Turn [${huntTurn}] 🔪\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n`;

                playerTurnDmg = Math.ceil(getRandomNumberBetween(playerMaxDmg * 0.8, playerMaxDmg));

                potionUsed = false;

                // check if dmg lower than 0
                if (playerTurnDmg < 0) {
                    playerTurnDmg = 0;
                }
                // check if grater than max dmg
                if (playerTurnDmg > playerMaxDmg) {
                    playerTurnDmg = playerMaxDmg;
                }

                monsterTurnDmg = Math.ceil(getRandomNumberBetween(monsterATK * 0.85, monsterATK));

                monsterTurnDmg = monsterTurnDmg * monsterDMGMultiplier;

                playerDodged = weightedRandom([false, true], [100 - playerDodgeRate, playerDodgeRate]).item;
                monsterDodged = weightedRandom([false, true], [100 - monsterDodgeRate, monsterDodgeRate]).item;


                turnCrit = weightedRandom([false, true], [100 - playerCritRate, playerCritRate]).item;

                if (userInfo.class === "Mage") {
                    playerMP = playerMP + Math.ceil(userInfo.mp * 0.05);
                    if (playerMP > userInfo.mp) {
                        playerMP = userInfo.mp;
                    }
                }
                newCollector.on('collect', async i => {
                    i.deferUpdate();
                    if (i.user.id !== interaction.user.id) return;
                    if (i.customId === "skill1") {
                        // assassin skill 1
                        if (userInfo.class == "Assassin") {
                            if (playerMP >= 30) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Assassin Skill 1\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                playerTurnDmg = Math.ceil(((playerTurnDmg + agi) * 0.5) * 3);
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                playerMP -= 30;
                            }
                        } else if (userInfo.class == "Mage") {
                            if (playerMP >= 30) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Mage Skill 1\n`;
                                huntTurnLog += `\nPrevious HP ${playerHP}`;
                                playerHP = Math.ceil(playerHP + (playerMaxDmg * 2));
                                if (playerHP > userInfo.hp) {
                                    playerHP = userInfo.hp;
                                }
                                huntTurnLog += `\nNew HP ${playerHP}`;
                                playerMP -= 30;
                            }
                        } else if (userInfo.class == "Warrior") {
                            if (playerMP >= 10) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Warrior Skill 1\n`;
                                huntTurnLog += `\nPrevious HP ${playerHP}`;
                                playerHP = Math.ceil(playerHP + (playerMaxDmg * 0.5));
                                if (playerHP > userInfo.hp) {
                                    playerHP = userInfo.hp;
                                }
                                huntTurnLog += `\nNew HP ${playerHP}`;
                                playerMP -= 10;
                            }
                        } else if (userInfo.class == "Tank") {
                            if (!tankSkill3.includes(userInfo.user_id)) {
                                if (playerMP >= 15) {
                                    skillUsed = true;
                                    huntTurnLog += `\nYou used Tank Skill 1\n`;
                                    huntTurnLog += `\nPrevious HP ${playerHP}`;
                                    playerHP = Math.ceil(playerHP + (userInfo.hp * 0.3));
                                    if (playerHP > userInfo.hp) {
                                        playerHP = userInfo.hp;
                                    }
                                    huntTurnLog += `\nNew HP ${playerHP}`;
                                    playerMP -= 15;
                                }
                            } else {
                                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKILL_CANNOT_BE_USED'))], ephemeral: true });
                            }
                        }
                        newCollector.stop();
                    } else if (i.customId === "skill2") {
                        // assassin skill 2
                        if (userInfo.class == "Assassin") {
                            if (playerMP >= 15) {
                                skillUsed = true;
                                assassinCounter += 2;
                                huntTurnLog += `\nYou used Assassin Skill 2\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                playerTurnDmg = Math.ceil(playerTurnDmg * 1.5);
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                playerMP -= 15;
                            }
                        } else if (userInfo.class == "Mage") {
                            if (playerMP >= 15) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Mage Skill 2\n`;
                                huntTurnLog += `\nPrevious Monster ATK ${monsterATK}`;
                                monsterATK = Math.ceil(monsterATK * 0.5);
                                huntTurnLog += `\nNew Monster ATK ${monsterATK}`;
                                playerMP -= 15;
                            }
                        } else if (userInfo.class == "Warrior") {
                            if (playerMP >= 15) {
                                skillUsed = true;
                                warriorCounter += 2;
                                huntTurnLog += `\nYou used Warrior Skill 2\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                playerTurnDmg = Math.ceil(playerTurnDmg * 1.5);
                                if (playerHP > userInfo.hp) {
                                    playerHP = userInfo.hp;
                                }
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                playerMP -= 15;
                            }
                        } else if (userInfo.class == "Tank") {
                            if (playerMP >= 15) {
                                skillUsed = true;
                                tankCounter += 2;
                                huntTurnLog += `\nYou used Tank Skill 2\n`;
                                playerMP -= 15;
                            }
                        }
                        newCollector.stop();
                    } else if (i.customId === "skill3") {
                        // assassin skill 3
                        if (userInfo.class == "Assassin") {
                            if (playerMP >= 35) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Assassin Skill 3\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                if (tankCounter == 0) {
                                    playerTurnDmg = Math.ceil((playerTurnDmg + agi * 0.5) * 3);
                                } else {
                                    playerTurnDmg = Math.ceil((playerTurnDmg + agi * 0.5) * 4.5);
                                }
                                let tempCritRate = Math.ceil(crit / monsterLvl * 21);
                                turnCrit = weightedRandom([false, true], [100 - tempCritRate, tempCritRate]).item;
                                if (turnCrit) {
                                    playerTurnDmg = Math.ceil(playerTurnDmg * 2);
                                }
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                playerMP -= 35;
                            }
                        } else if (userInfo.class == "Mage") {
                            if (playerMP >= mageMPIncreasePerSec + 10) {
                                skillUsed = true;
                                huntTurnLog += `\nYou used Mage Skill 3\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                if (warriorCounter == 0) {
                                    playerTurnDmg = Math.ceil((playerTurnDmg * 4) + mageMPIncreasePerSec);
                                } else {
                                    playerTurnDmg = Math.ceil((playerTurnDmg * 8) + mageMPIncreasePerSec);
                                }
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                turnCrit = true;
                                playerMP -= mageMPIncreasePerSec + 10;
                            }
                        } else if (userInfo.class == "Warrior") {
                            if (playerMP >= 30) {
                                skillUsed = true;
                                warriorCounter += 3;
                                huntTurnLog += `\nYou used Warrior Skill 3\n`;
                                huntTurnLog += `\nPrevious DMG ${playerTurnDmg}`;
                                if (assassinCounter == 0) {
                                    playerTurnDmg = Math.ceil((playerTurnDmg * 3));
                                } else {
                                    playerTurnDmg = Math.ceil((playerTurnDmg * 4.5));
                                }
                                huntTurnLog += `\nNew DMG ${playerTurnDmg}`;
                                playerMP -= 30;
                            }
                        } else if (userInfo.class == "Tank") {
                            if (!tankSkill3.includes(userInfo.user_id)) {
                                if (playerHP >= (userInfo.hp * 0.1)) {
                                    skillUsed = true;
                                    huntTurnLog += `\nYou used Tank Skill 3\n`;
                                    huntTurnLog += `\nPrevious DMG ${playerTemTurnDmg}`;
                                    playerTurnDmg = Math.ceil(userInfo.hp * 0.35);
                                    playerHP -= Math.ceil(userInfo.hp * 0.35);
                                    huntTurnLog += `\nNew DMG ${playerTemTurnDmg}`;
                                    tankSkill3.push(userInfo.user_id);
                                    tankSkillLastAdded = userInfo.user_id;
                                }
                            } else {
                                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SKILL_CANNOT_BE_USED'))], ephemeral: true });
                            }
                        }
                        newCollector.stop();
                    } else if (i.customId === "heal") {
                        newCollector.resetTimer(40000);
                        if (userHPPotionsData !== undefined && userHPPotionsData.quantity > potionsToUse) {
                            potionUsed += potionsToUse;
                            huntTurnLog += `\nPOTIONS USED NOW -> [${potionsToUse}/${userHPPotionsData.quantity + potionUsed}]\nTOTAL POTIONS USED -> [${potionUsed}]`;
                            potionsHP = potionsToUse * 30;
                            playerTemHP = playerHP + potionsHP;
                            userHPPotionsData.quantity = userHPPotionsData.quantity - potionsToUse;
                            if (playerTemHP > userInfo.hp) playerTemHP = userInfo.hp;
                            playerHP = playerTemHP;
                            huntTurnLog += `\n\nADDED HP -> [${potionsHP}]\nNEW HP -> [${playerTemHP}/${userInfo.hp}]\n-----------------------------------------------------`
                            potionUsed = true;
                            embed = new MessageEmbed()
                                .setColor(interaction.client.colors.yellow)
                                .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                                .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_HUNT'), iconURL: interaction.user.avatarURL() })
                                .addFields(
                                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, inline: true },
                                    { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `<:hp:740144919233953834> ${monsterHP}/${monsterHP}\n<:rg:740144919406182421> 0/100`, inline: true },
                                    {
                                        name: interaction.client.getWordLanguage(serverSettings.lang, 'LAST_TURN_DMG'),
                                        value: interaction.client.getWordLanguage(serverSettings.lang, 'POTION_USED'), inline: false
                                    },
                                )
                            await interaction.editReply({ embeds: [embed] })
                        } else {
                            huntTurnLog += `\n>> NOT HP POTIONS AVAILABLE <<\n-----------------------------------------------------`;
                            await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'NOT_HP_POTIONS_AVAILABLE'))], ephemeral: true });
                            await interaction.editReply({ components: [rowSkillsWithoutHeal] });
                        }
                    } else {
                        newCollector.stop();
                    }
                })
                newCollector.on('end', async i => {
                    if (turnCrit) {
                        playerTurnDmg += playerTurnDmg;
                    }

                    if (!potionUsed) {
                        if (assassinCounter > 0) {
                            playerTurnDmg = Math.ceil((playerTurnDmg * 1.2));
                        }
                        if (warriorCounter > 0) {
                            playerTurnDmg = Math.ceil((playerTurnDmg * 1.2));
                        }

                        if (!skillUsed) {
                            if (monsterDodged) {
                                playerTurnDmg = 0;
                            }
                            if (turnCrit) {
                                playerTurnDmg = Math.ceil(playerTurnDmg * 2);
                            }
                        } else {
                            if (userInfo.class == "Warrior") {
                                if (turnCrit) {
                                    playerTurnDmg = Math.ceil(playerTurnDmg * 2);
                                }
                            }
                        }

                        if (playerDodged) {
                            if (userInfo.class == "Assassin") {
                                if (monsterATK > 0) {
                                    playerTurnDmg = Math.ceil(playerTurnDmg * 1.5 + monsterATK);
                                }
                            }
                            monsterATK = 0;
                        }
                        if (monsterATK == 0) {
                            miss = true;
                        }

                        rage += utility.getRandomNumberBetween(25, 35);

                        if (rage > 100) {
                            rage = 100;
                        }

                        huntTurnLog += `\n⦿ Rage -> [${rage}/100]`;

                        if (rage > 99) {
                            monsterATK = Math.ceil(monsterATK * 3);
                            huntTurnLog += `\n⦿ Monster RAGE ATK -> [${monsterATK}]`;
                            rage = 0;
                        }

                        if (userInfo.class == "Tank") {
                            if (playerTurnDmg > 0) {
                                if (monsterLvl > userInfo.level) {
                                    tempDMG = Math.ceil(monsterATK * (1 - ((levelDiff * 10) / 100)));
                                    if (tempDMG < 0) tempDMG = 0;
                                    playerTurnDmg += tempDMG;
                                }
                            }
                        }

                        huntTurnLog += `\n⦿ ${userInfo.username} attacked ${monsterName} for ${playerTurnDmg} amount of damage${turnCrit ? ' with CRIT' : ''}.`

                        if (userInfo.class == "Warrior") {
                            playerHP += Math.ceil(playerTurnDmg * 0.15);
                            if (playerHP > userInfo.hp) playerHP = userInfo.hp;
                            huntTurnLog += `\n⦿ [WARRIOR PASSIVE] absorbed ${Math.ceil(playerTurnDmg * 0.15)} amount of HP.`
                        }
                        huntTurnLog += `\n⦿ ${monsterName} attacked ${userInfo.username} for ${miss ? ' 0 Missed' : `${monsterATK} DMG`}.`

                        if (monsterATK > 0) {
                            monsterATK -= userArmor;
                            if (monsterATK < 0) monsterATK = 0;
                            huntTurnLog += `\n⦿ ${userInfo.username} armor reduced attack to ${monsterATK} DMG.`
                        }

                        monsterHP -= playerTurnDmg;
                        if (monsterHP < 1) {
                            monsterHP = 0;
                            continueHunt = false;
                            huntTurnLog += `\n>> ${monsterName} died <<`
                        }

                        if (continueHunt) {

                            if (userInfo.class == "Mage") {
                                if (playerMP == userInfo.mp && monsterATK > 0) {
                                    monsterATK = Math.ceil(monsterATK * 0.8);
                                    if (monsterATK < 0) monsterATK = 0;
                                    huntTurnLog += `\n⦿ [MAGE PASSIVE] reduced attack to ${monsterATK > 0 ? 'DMG' : 'Nullified'}.`;
                                }
                            }

                            playerHP -= monsterATK;

                            huntTurnLog += `\n⦿ ${userInfo.username} HP -> [${playerHP}/${userInfo.hp}]`;
                            huntTurnLog += `\n⦿ ${monsterName} HP -> [${monsterHP}/${selectedMonster.hp}]`;
                            if (playerHP < 1) {
                                playerHP = 0;
                                continueHunt = false;
                                playerDied = true;
                                huntTurnLog += `\n>> ${userInfo.username} DIED <<`;
                            }
                        }
                    }

                    huntLog.push(huntTurnLog);
                    if (continueHunt) {
                        embed = new MessageEmbed()
                            .setColor('0x14e188')
                            .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                            .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'BOSS_HUNT'), iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `<:hp:740144919233953834> ${monsterHP}/${selectedMonster.hp}\n<:rg:740144919406182421> ${rage}/100`, inline: true },
                                {
                                    name: interaction.client.getWordLanguage(serverSettings.lang, 'LAST_TURN_DMG'),
                                    value: `${interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_DMG')}${monsterATK}\n${interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_DMG')}${playerTurnDmg}`, inline: false
                                },
                            )
                        await interaction.editReply({ embeds: [embed] })
                    }
                    awaitConfirmation = false;
                })
                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            if (potionUsed > 0) {
                // deduct used potions
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [potionUsed, interaction.user.id, "HP_Potion_lvl_1"])
            }
            var huntEndEmbed = "";
            if (!playerDied) {
                if (["", "None"].includes(userInfo.clan_tag)) {
                    await userDailyLogger(interaction, interaction.user, "hunt", `Hunt completed. Rewards -> EXP -> [${monsterExp}] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}] DROP/S -> [${dropString.substring(1)}]`);
                    huntEndEmbed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_COMPLETED') })
                        .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                        .addFields(
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `${monsterRankEmoji} ${selectedMonster.name} LvL${monsterLvl}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'REWARDS'), value: `\`\`\`css\nEXP -> [${monsterExp}] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}]\`\`\``, inline: false },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'FOUND_MATERIALS'), value: `\`\`\`css\n${dropString.substring(1)}\`\`\``, inline: false }
                        )
                        .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_POTIONS').format(potionUsed) });
                } else {
                    await userDailyLogger(interaction, interaction.user, "hunt", `Hunt completed. Rewards -> EXP -> [${Math.ceil(monsterExp * 0.9)}] [${Math.ceil(monsterExp * 0.1)} for CLAN] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}] DROP/S -> [${dropString.substring(1)}]`);
                    huntEndEmbed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_COMPLETED') })
                        .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                        .addFields(
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'MONSTER_INFO'), value: `${monsterRankEmoji} ${selectedMonster.name} LvL${monsterLvl}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'YOUR_INFO'), value: `<:hp:740144919233953834> ${playerHP}/${userInfo.hp}\n<:mp:740144919125164044> ${playerMP}/${userInfo.mp}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'REWARDS'), value: `\`\`\`css\nEXP -> [${Math.ceil(monsterExp * 0.9)}] [${Math.ceil(monsterExp * 0.1)} for CLAN] GOLD -> [${monsterGold}] HONOR -> [${monsterLvl}]\`\`\``, inline: false },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'FOUND_MATERIALS'), value: `\`\`\`css\n${dropString.substring(1)}\`\`\``, inline: false }
                        )
                        .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_POTIONS').format(potionUsed) });
                    monsterExp = Math.ceil(monsterExp * 0.9);
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
                        await userDailyLogger(interaction, interaction.user, "boss-hunt", `User level updated from [${userInfo.level}] to [${userInfo.level + levelDiff}]`);
                        await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'PLAYER_LEVEL_UP').format(interaction.user.username, userInfo.level + levelDiff, levelDiff))] })
                    } else {
                        monsterExp = currentExp;
                    }
                }
                // add gold, exp, honor
                await interaction.client.databaseEditData("update users set gold = gold + ? , exp = ? , honor = honor + ?, free_stat_points = ?, hp = ?, current_hp = ?, current_mp = ?, level = ?,l_kills = l_kills + 1 where user_id = ?",
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
                    .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_DIED').format(interaction.user.username, `${selectedMonster.name} LvL${monsterLvl}`) })
                    .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                    .addFields(
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST'), value: `\`\`\`css\nEXP -> [${userInfo.exp}] GOLD -> [${goldLost}]\`\`\``, inline: false }
                    )
                await userDailyLogger(interaction, interaction.user, "boss-hunt", `Player Died. Penalties EXP -> [${userInfo.exp}] GOLD -> [${goldLost}]`)
                await interaction.client.databaseEditData("update users set gold = gold - ?, exp = ?, current_hp = hp, current_mp = mp where user_id = ?", [goldLost, userInfo.exp, interaction.user.id])
            } else if (playerDied && deathHuntCount != 0) {
                showLog = true;
                if (deathHuntCount === -1) {
                    deathHuntCount = 0;
                    huntLog.push(`\n\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n\t\tDEATH PROTECTION **USED**\n\t\tNO PENALTIES APPLIED\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n|||||||||||||||||||||||||||||||||||||||||||||||||||||\n`)
                    await interaction.client.databaseEditData("update buff set death_protection = ? where user_id = ?", [deathHuntCount, interaction.user.id]);
                }
                huntEndEmbed = new MessageEmbed()
                    .setColor('0xed4245')
                    .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'HUNT_DIED').format(interaction.user.username, `${selectedMonster.name} LvL${monsterLvl}`) })
                    .setThumbnail(`https://obelisk.club/monsters/${selectedMonster.img_link}.png`)
                    .addFields(
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST'), value: `\`\`\`css\n${interaction.client.getWordLanguage(serverSettings.lang, 'DIED_COST_NONE')}\`\`\``, inline: false }
                    )
                await userDailyLogger(interaction, interaction.user, "boss-hunt", `Player Died. Protection found, no penalties applied.`)
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
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
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

const rowFightYesNo = new MessageActionRow()
    .addComponents(

        new MessageButton()
            .setCustomId('attack')
            .setLabel('ATTACK')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('run')
            .setLabel('RUN')
            .setStyle('DANGER'),
    );

const rowSkills = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('attack')
            .setLabel('ATTACK')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill1')
            .setLabel('SKILL 1')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill2')
            .setLabel('SKILL 2')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill3')
            .setLabel('SKILL 3')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('heal')
            .setLabel('HEAL')
            .setStyle('SUCCESS'),
    );


const rowSkillsWithoutHeal = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('attack')
            .setLabel('ATTACK')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill1')
            .setLabel('SKILL 1')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill2')
            .setLabel('SKILL 2')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('skill3')
            .setLabel('SKILL 3')
            .setStyle('PRIMARY')
    );

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