const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('This command allows you to enter boss room.')
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

            var mapData = await interaction.client.databaseSelectData("select min_lvl, max_lvl from area where tag = ?", [userInfo.area_tag.replaceAll(" ", "_")]);

            if (mapData[0].max_lvl - 2 > userInfo.level) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_BOSS_LEVEL").format(mapData[0].max_lvl - 2), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
            }


            var interactionReplied = false;
            var selectedRightCapthca = false;
            var addedSleepTime = 0;
            var captchaTimeout = false;
            var dateStr = ""
            var collectorFilter;
            var collector;
            var continueCode = true;

            let keyData = await interaction.client.databaseSelectData("select * from user_inventory where user_id = ? and item_name = ?", [interaction.user.id, `Boss_Key_${userInfo.area_tag.replaceAll(" ", "_")}`])

            if (keyData[0] === undefined || keyData[0].quantity < 1) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_NO_BOSS_KEY"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
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

                        collector = msg.createMessageComponentCollector({ time: 15000 });

                        collector.on('collect', async i => {
                            i.deferUpdate();
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
            // await interaction.client.databaseEditData("update users set boss_fight = ? where user_id = ?", [dateStr, interaction.user.id]);

            // generate monster

            let selectedMonster = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity = ?", [userInfo.area_tag.replaceAll(' ', '_'), "Boss"]);

            if (selectedMonster[0] === undefined) {
                if (interactionReplied) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_BOSS'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_BOSS'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                }
            }

            selectedMonster = selectedMonster[0]

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
                        await userDailyLogger(interaction, interaction.user, "familiar", "Familiar Unequipped low happiness")
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

            monsterLvl = getRandomNumberBetween(selectedMonster.min_lvl, selectedMonster.max_lvl);

            var monsterRankEmoji = "<a:boss:738786415512387644>";

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

            const enteryingRoomEmbed = new MessageEmbed()
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
                    embeds: [enteryingRoomEmbed], components: []
                })
            } else {
                interactionReplied = true;
                await interaction.reply({ embeds: [enteryingRoomEmbed], components: [] })
            }

            await new Promise(r => setTimeout(r, 2000));

            if (interactionReplied) {
                await interaction.editReply({
                    embeds: [huntingEmbed], components: [rowFightYesNo]
                })
            } else {
                interactionReplied = true;
                await interaction.reply({ embeds: [huntingEmbed], components: [rowFightYesNo] })
            }

            // check if gonna keep going
            awaitConfirmation = true;
            collector = msg.createMessageComponentCollector({ time: 15000 });

            let chooseToRun = true;
            let embed;
            continueCode = false;

            collector.on('collect', async i => {
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


            collector = msg.createMessageComponentCollector({ time: 15000 });

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