const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
const utility = require('../Utility/utils');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('familiar')
        .setDescription('Check your familiars!')
        .addSubcommand(subcommand => subcommand
            .setName('info')
            .setDescription('Check your equipped/mentioned familiar!'))
        .addSubcommand(subcommand => subcommand
            .setName('equip')
            .setDescription('Equip a familiar!')
            .addStringOption(option => option
                .setName('id')
                .setDescription('The id of the familiar you want to equip.')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('un-equip')
            .setDescription('Un-equip a familiar!'))
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List all familiars!')
            .addStringOption(option => option
                .setName('list-type')
                .setDescription('Select list of familiars to show.')
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Favorite', value: 'favorite' }
                ))
            .addStringOption(option => option
                .setName('familiar-type')
                .setDescription('Type of familiar to list.')
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: "Belltail", value: "Belltail" },
                    { name: "Dyneema", value: "Dyneema" },
                    { name: 'Floret', value: 'Floret' },
                    { name: 'Grug', value: 'Grug' },
                    { name: 'Iratus', value: 'Iratus' },
                    { name: 'Lluvia', value: 'Lluvia' },
                    { name: 'Mystopia', value: 'Mystopia' },
                    { name: 'Ryobi', value: 'Ryobi' },
                    { name: 'Turmaloid', value: 'Turmaloid' },
                    { name: 'Volant', value: 'Volant' }
                ))
            .addStringOption(option => option
                .setName('familiar-stat')
                .setDescription('Stat to sort by.')
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: "Strength", value: "str" },
                    { name: "Vitality", value: "def" },
                    { name: "Intelligence", value: "intel" },
                    { name: "Dexterity", value: "dex" },
                    { name: "Agility", value: "agi" },
                    { name: "Luck", value: "luck" },
                    { name: "Critic", value: "crit" }
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('hunt')
            .setDescription('Send familiar to hunt!')
            .addStringOption(option => option
                .setName('map')
                .setDescription('The map tag to hunt on!')))
        .addSubcommand(subcommand => subcommand
            .setName('level-up')
            .setDescription('Level up your familiar! (Cost gold)')
            .addIntegerOption(option => option
                .setName('id')
                .setDescription('The id of the familiar to level up!')))
        .addSubcommand(subcommand => subcommand
            .setName('evolve')
            .setDescription('Evolve a familiar!')
            .addStringOption(option => option
                .setName('first-id')
                .setDescription('The ID of the first familiar')
                .setRequired(true))
            .addStringOption(option => option
                .setName('second-id')
                .setDescription('The ID of the second familiar')
                .setRequired(true))
            .addStringOption(option => option
                .setName('third-id')
                .setDescription('The ID of the third familiar')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('rename')
            .setDescription('Rename a familiar! (Require 1k gold)')
            .addStringOption(option => option
                .setName('id')
                .setDescription('The ID of the familiar to rename.'))
            .addStringOption(option => option
                .setName('name')
                .setDescription('The new name of the familiar.')))
        .addSubcommand(subcommand => subcommand
            .setName('favorite')
            .setDescription('Add/Remove familiar from favorite list!')
            .addStringOption(option => option
                .setName('option')
                .setDescription('option')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' }
                ))
            .addStringOption(option => option
                .setName('id')
                .setDescription('The ID of the familiar to add/remove.')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('reroll')
            .setDescription('Re-roll a familiar!')
            .addStringOption(option => option
                .setName('first-id')
                .setDescription('The ID of the first familiar')
                .setRequired(true))
            .addStringOption(option => option
                .setName('second-id')
                .setDescription('The ID of the second familiar')
                .setRequired(true))
            .addStringOption(option => option
                .setName('third-id')
                .setDescription('The ID of the third familiar')
                .setRequired(true))),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {

            if (interaction.options.getSubcommand() == 'info') {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }
                var familiarInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                familiarInfo = familiarInfo[0];
                var agi = userInfo.agi;
                var str = userInfo.str;
                var dex = userInfo.dex;
                var vit = userInfo.def;
                var intel = userInfo.intel;
                var atk = userInfo.attack;
                var crit = userInfo.crit;
                var luck = userInfo.luck;
                if (familiarInfo !== undefined) {
                    if (familiarInfo.happiness > 50) {
                        var petStatData = familiarInfo.stat.split("-");
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
                        await utility.updateUserStatsFamiliar(interaction, userInfo, familiarInfo);
                        return await interaction.editReply({
                            embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [], ephemeral: true
                        })
                    }
                }


                // const requestBody = {
                //     pet_id: userInfo.pet_id,
                //     pet_name: familiarInfo.name,
                //     pet_race: familiarInfo.race,
                //     username: interaction.user.username,
                //     pet_level: familiarInfo.level,
                //     pet_img: familiarInfo.img,
                //     pet_stamina: familiarInfo.stamina,
                //     pet_max_stamina: familiarInfo.max_stamina,
                //     pet_happiness: familiarInfo.happiness,
                //     pet_max_happiness: familiarInfo.max_happiness,
                //     pet_stat: familiarInfo.stat

                // }

                // var data = await fetch(`https://api.obelisk.club/ObeliskAPI/familiar`, {
                //     method: 'POST',
                //     headers: {
                //         'x-api-key': process.env.API_KEY,
                //         'Content-Type': 'application/json'
                //     },
                //     body: JSON.stringify(requestBody)
                // })
                //     .then(response => response.json())
                //     .then(data => { return data });
                // if (data.success == true) {
                //     await interaction.editReply(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                // } else {
                //     await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                //     errorLog.custom(data.error, interaction);
                // }
                let embed = new MessageEmbed()
                    .setColor(interaction.client.colors.green)
                    .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                    .addFields(
                        { name: "ID", value: familiarInfo.pet_id, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: familiarInfo.name, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: familiarInfo.race, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `${familiarInfo.happiness}/${familiarInfo.max_happiness}`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `${familiarInfo.stamina}/${familiarInfo.max_stamina}`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${(familiarInfo.stat).replaceAll('-', ' +')}](https://obelisk.club/pets/pet_img/${familiarInfo.img}.png)`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: familiarInfo.exp.toString(), inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: familiarInfo.level.toString(), inline: true }
                    )
                    .setThumbnail(`https://obelisk.club/pets/pet_img/${familiarInfo.img}.png`);
                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.options.getSubcommand() == 'equip') {

                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_COMMAND_LOCKED"))], ephemeral: true });
                }

                let currentFamiliarInfo;
                let familiarID = interaction.options.getString('id');

                // set on db user changing familiar 
                await interaction.client.databaseEditData("update users set changing_pet = 'true' where user_id = ?", [userInfo.user_id]);

                if (!['none', '', null, 'null'].includes(userInfo.pet_id)) {

                    currentFamiliarInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                    currentFamiliarInfo = familiarInfo[0];

                    // check if familiar in hunt
                    if (currentFamiliarInfo.hunt_map !== "null") {
                        await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_HUNT_LOCKED"))], ephemeral: true });
                    }


                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_CHANGE_E'))], components: [rowYesNo] });
                    const collectorConfirm = msg.createMessageComponentCollector({ time: 25000 });
                    let awaitConfirmation = true;

                    collectorConfirm.on('collect', async i => {
                        await i.deferUpdate();
                        if (i.user.id !== interaction.user.id) {
                            return;
                        }
                        awaitConfirmation = false;
                        if (i.customId === 'no') {
                            await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                            return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_CHANGE_CANCEL'))], components: [] });
                        }
                    })

                    await new Promise(resolve => {
                        setTimeout(resolve, 1000);
                    })

                }
                let familiarInfo = {
                    pet_id: 'none',
                    name: 'None',
                    stat: 'None-None'
                }
                // show available familiars
                let tempFamiliarInfo = await interaction.client.databaseSelectData('SELECT * FROM users_pet WHERE user_id = ? and pet_id = ?', [interaction.user.id, familiarID]);
                if (tempFamiliarInfo.length < 1) {
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_FOUND_LIST').format())], ephemeral: true });
                } else {
                    familiarInfo = tempFamiliarInfo[0];
                }

                if (familiarInfo.pet_id === userInfo.pet_id.toUpperCase()) {
                    await interaction.followUp({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_EQUIPPED'))], ephemeral: true });
                } else {
                    await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_SELECTED'))], components: [] });
                    let vit = userInfo.def;
                    let intel = userInfo.intel;

                    var petStatData = familiarInfo.stat.split("-");
                    if (petStatData[0] === "def") {
                        vit += parseInt(petStatData[1])
                    } else if (petStatData[0] === "intel") {
                        intel += parseInt(petStatData[1])
                    }

                    // get equipment info

                    let weaponInfo = await interaction.client.databaseSelectData("select * from created_eqp where user_id = ? and item_id = ?", [userInfo.user_id, userInfo.eqp_weapon]);
                    let armorInfo = await interaction.client.databaseSelectData("select * from created_eqp where user_id = ? and item_id = ?", [userInfo.user_id, userInfo.eqp_armor]);

                    if (weaponInfo.length > 0) {
                        weaponInfo = weaponInfo[0];
                    } else {
                        weaponInfo = "None";
                    }

                    if (armorInfo.length > 0) {
                        armorInfo = armorInfo[0];
                    } else {
                        armorInfo = "None";
                    }

                    let hp = 0;
                    let mp = 0;
                    let atk = 0;
                    let def = 0;

                    let current_hp = userInfo.current_hp;
                    let current_mp = userInfo.current_mp;

                    if (userInfo.level < 30) {
                        hp = Math.ceil(30 * vit + 85 + 15 * userInfo.level);
                    } else {
                        hp = Math.ceil(userInfo.level * vit + 85 + 15 * userInfo.level);
                    }

                    mp = Math.ceil(intel * 15 + 85);

                    if (weaponInfo !== "None") {
                        hp += weaponInfo.hp;
                        mp += weaponInfo.mp;
                        atk += weaponInfo.attack;
                        def += weaponInfo.armor;
                    }

                    if (armorInfo !== "None") {
                        hp += armorInfo.hp;
                        mp += armorInfo.mp;
                        atk += armorInfo.attack;
                        def += armorInfo.armor;
                    }

                    if (current_hp > hp) {
                        current_hp = hp;
                    }
                    if (current_mp > mp) {
                        current_mp = mp;
                    }

                    await interaction.client.databaseEditData("update users set hp = ?, mp = ?, attack = ?, armor = ?, current_hp = ? , current_mp = ?, pet_id = ?, changing_pet = 'false' where user_id = ?",
                        [hp, mp, atk, def, current_hp, current_mp, familiarInfo.pet_id, userInfo.user_id]);
                }

            } else if (interaction.options.getSubcommand() == 'un-equip') {
                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_COMMAND_LOCKED"))], ephemeral: true });
                }

                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NO'))], ephemeral: true });
                } else {
                    let tempFamiliarInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                    if (tempFamiliarInfo[0].hunt_map !== "null") {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_HUNT_LOCKED"))], ephemeral: true });
                    }
                }

                let familiarInfo = {
                    pet_id: 'none',
                    name: 'None',
                    stat: 'None-None'
                }

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_REMOVED').format(userInfo.pet_id))], components: [] });

                await utility.updateUserStatsFamiliar(interaction, userInfo, familiarInfo);

            } else if (interaction.options.getSubcommand() == 'list') {
                let listType = interaction.options.getString('list-type');
                let familiarType = interaction.options.getString('familiar-type');
                let familiarStat = interaction.options.getString('familiar-stat');

                if (listType == null) {
                    listType = 'all';
                }

                let searchCriteria = `List Type: ${listType}`;
                if (familiarType != null) {
                    searchCriteria += `\nFamiliar Type: ${familiarType}`;
                }
                if (familiarStat != null) {
                    searchCriteria += `\nFamiliar Stat: ${familiarStat}`;
                }


                let familiars = "";

                if (listType == 'all' && familiarType == null && familiarStat == null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ?", [userInfo.user_id]);
                } else if (listType == 'all' && familiarType != null && familiarStat == null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and race like ?", [userInfo.user_id, familiarType]);
                } else if (listType == 'all' && familiarType == null && familiarStat != null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and stat like ?", [userInfo.user_id, familiarStat]);
                } else if (listType == 'all' && familiarType != null && familiarStat != null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and type like ? and stat like ?", [userInfo.user_id, familiarType, familiarStat]);
                } else if (listType == 'favorite' && familiarType == null && familiarStat == null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and favorite = 1", [userInfo.user_id]);
                } else if (listType == 'favorite' && familiarType != null && familiarStat == null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and race like ? and favorite = 1", [userInfo.user_id, familiarType]);
                } else if (listType == 'favorite' && familiarType == null && familiarStat != null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and stat like ? and favorite = 1", [userInfo.user_id, familiarStat]);
                } else if (listType == 'favorite' && familiarType != null && familiarStat != null) {
                    familiars = await interaction.client.databaseSelectData("select * from users_pet where user_id = ? and type like ? and stat like ? and favorite = 1", [userInfo.user_id, familiarType, familiarStat]);
                }

                if (familiars.length < 1) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NF_SEARCH').format(searchCriteria))], ephemeral: true });
                }

                if (familiars.length > 1) {
                    let embed = new MessageEmbed()
                        .setColor(interaction.client.colors.green)
                        .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                        .addFields(
                            { name: "ID", value: familiars[0].pet_id, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: familiars[0].name, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: familiars[0].race, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `${familiars[0].happiness}/${familiars[0].max_happiness}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `${familiars[0].stamina}/${familiars[0].max_stamina}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${(familiars[0].stat).replaceAll('-', ' +')}](https://obelisk.club/pets/pet_img/${familiars[0].img}.png)`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: familiars[0].exp.toString(), inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: familiars[0].level.toString(), inline: true }
                        )
                        .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_PAGE').format(1, familiars.length) })
                        .setThumbnail(`https://obelisk.club/pets/pet_img/${familiars[0].img}.png`);
                    await interaction.editReply({ embeds: [embed], components: [rowArrow] });
                    await familiarListView(interaction, serverSettings, msg, familiars);
                } else {
                    let embed = new MessageEmbed()
                        .setColor(interaction.client.colors.green)
                        .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                        .addFields(
                            { name: "ID", value: familiars[0].pet_id, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: familiars[0].name, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: familiars[0].race, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `${familiars[0].happiness}/${familiars[0].max_happiness}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `${familiars[0].stamina}/${familiars[0].max_stamina}`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${(familiars[0].stat).replaceAll('-', ' +')}](https://obelisk.club/pets/pet_img/${familiars[0].img}.png)`, inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: familiars[0].exp.toString(), inline: true },
                            { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: familiars[0].level.toString(), inline: true }
                        )
                        .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_PAGE').format(1, familiars.length) })
                        .setThumbnail(`https://obelisk.club/pets/pet_img/${familiars[0].img}.png`);

                    await interaction.editReply({ embeds: [embed] });
                }


            } else if (interaction.options.getSubcommand() == 'hunt') {
                var todayDate = new Date();
                let mapID = interaction.options.getString("map");
                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_COMMAND_LOCKED"))], ephemeral: true });
                }

                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NO'))], ephemeral: true });
                }
                let familiarInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                familiarInfo = familiarInfo[0];
                if (familiarInfo.hunt_map !== "null") {
                    // familiar hunting

                    let millLeft = interaction.client.strToDate(familiarInfo.hunt_duration).getTime() - todayDate.getTime();
                    millLeft = utility.msToTime(millLeft);

                    if (millLeft == "Ready") {
                        const allMonsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ?", [familiarInfo.hunt_map.replaceAll(' ', '_')]);
                        let mapDrops = [];
                        let foundDrops = [];
                        let foundDropsQuantity = [];
                        let currentMonsterDrop = [];
                        let randomDrop = "";
                        let randomDropQuantity = 5 + Math.ceil(familiarInfo.level / 2);

                        let index = 0;

                        for (let i = 0; i < allMonsters.length; i++) {
                            if (allMonsters[i].rarity == "Common") {
                                currentMonsterDrop = allMonsters[i].drop_n_q.split(';');
                                for (let j = 0; j < currentMonsterDrop.length; j++) {
                                    // check if drop is already in map drops
                                    if (!mapDrops.includes(currentMonsterDrop[j])) {
                                        mapDrops.push(currentMonsterDrop[j]);
                                    }
                                }
                            }
                        }
                        for (let i = 0; i < familiarInfo.hunt_minutes; i++) {
                            randomDrop = mapDrops[Math.floor(Math.random() * mapDrops.length)].split('-')[0];
                            // check if drop is already in found drops
                            if (!foundDrops.includes(randomDrop)) {
                                foundDrops.push(randomDrop);
                                foundDropsQuantity.push(randomDropQuantity);
                            } else {
                                index = foundDrops.indexOf(randomDrop);
                                foundDropsQuantity[index] += randomDropQuantity;
                            }
                        }
                        let foundDropsString = "";
                        for (let i = 0; i < foundDrops.length; i++) {
                            foundDropsString += `${foundDrops[i].replaceAll('_', ' ')} x${foundDropsQuantity[i]}\n`;
                        }
                        let exp = familiarInfo.hunt_minutes * familiarInfo.exp_per_hunt;
                        let embed = new MessageEmbed()
                            .setColor(interaction.client.colors.green)
                            .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_COMPLETED'), iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP_EARNED'), value: exp.toString(), inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'FOUND_MATERIALS'), value: `\`\`\`css\n${foundDropsString}\`\`\``, inline: false },
                            )
                            .setThumbnail(`https://obelisk.club/pets/pet_img/${familiarInfo.img}.png`);

                        await interaction.editReply({ embeds: [embed] });
                        await userDailyLogger(interaction, interaction.user, "familiar", `Familiar hunt completed found [${foundDropsString.replaceAll('\n', ', ')}]`);

                        await interaction.client.databaseEditData("update users_pet set hunt_map = 'null', hunt_duration = 'null', hunt_minutes = '0' where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                        if (foundDrops.length > 0) {
                            for (var i = 0; i < foundDrops.length; i++) {
                                await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, foundDrops[i], foundDropsQuantity[i], foundDropsQuantity[i]])
                            }
                        }
                        var levelUpResp = await fetch(`https://obelisk.club/pet.php?pet_id=${userInfo.pet_id.toUpperCase()}&hunt_exp=${exp}&type=check_level_up`, {
                            method: 'POST',
                            headers: {
                                'x-api-key': process.env.API_KEY,
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(response => response.json())
                            .then(data => { return data });

                        if (levelUpResp == "Level up") {
                            await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_LEVEL_UP').format(familiarInfo.level + 1))], ephemeral: true });
                        }

                    } else {
                        // familiar hunting
                        let embed = new MessageEmbed()
                            .setColor(interaction.client.colors.red)
                            .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_NOT_READY'), iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_TIME'), value: millLeft, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_MAP'), value: familiarInfo.hunt_map, inline: true }
                            )
                            .setThumbnail(`https://obelisk.club/pets/pet_img/${familiarInfo.img}.png`);
                        await interaction.editReply({ embeds: [embed] });
                    }
                } else {
                    if (mapID == null) {
                        mapID = userInfo.area_tag;
                    }

                    let availableMaps = userInfo.killed_boss_map.split(';');
                    // check if map is available
                    if (!availableMaps.includes(mapID)) {
                        return await interaction.followUp({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_MAP_NOT_AVAILABLE'))], ephemeral: true });
                    }
                    // familiar not hunting and map id given
                    const allMonsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity != 'Boss'", [mapID.replaceAll(' ', '_')]);
                    let index = allMonsters.length - 1;
                    let monsterLVl = allMonsters[index].max_lvl - 1;
                    let monsterHP = Math.ceil(allMonsters[index].hp + (allMonsters[index].hp * 0.7) * monsterLVl);
                    let monsterXP = Math.ceil(monsterHP * 0.08 + (monsterHP * 0.05 * (monsterLVl - familiarInfo.level) / 10));

                    // check if happiness is lower than 30
                    if (familiarInfo.happiness < 30) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_HAPPINESS_LOW'))], ephemeral: true });
                    }
                    let awaitConfirmation = true;
                    // check if familiar can level up
                    if (familiarInfo.level_up_available != 0) {
                        await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_FULL_EXP'))], components: [utility.rowYesNo] });

                        let collector = msg.createMessageComponentCollector({ time: 40000 });

                        collector.on('collect', async (i) => {
                            await i.deferUpdate();
                            if (i.user.id != interaction.user.id) {
                                return;
                            }
                            awaitConfirmation = false;
                            if (i.customId != "yes") {
                                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_CANCEL'))], ephemeral: true, components: [] });
                            }
                        })

                        collector.on('end', async (i) => {
                            // timeout
                            return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'COMMAND_TIMEOUT'))], ephemeral: true, components: [] });
                        })
                        while (awaitConfirmation) {
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    let staminaCost = Math.ceil(monsterLVl / 2 + monsterLVl - familiarInfo.level);
                    if (staminaCost < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_LEVEL'))], ephemeral: true });
                    }
                    let huntMin = Math.ceil(familiarInfo.stamina / staminaCost);
                    if (huntMin < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LOW_S').format(staminaCost))], ephemeral: true });
                    }

                    let currentDate = new Date();
                    let seconds = 0
                    let familiarRank = familiarInfo.img.split('_')[1];
                    if (familiarRank == "1") {
                        seconds = 60 * huntMin;
                    } else if (familiarRank == "2") {
                        seconds = 50 * huntMin;
                    } else if (familiarRank == "3") {
                        seconds = 40 * huntMin;
                    }

                    currentDate.setSeconds(currentDate.getSeconds() + seconds);
                    let familiarHappiness = familiarInfo.happiness - huntMin;
                    if (familiarHappiness < 1) {
                        familiarHappiness = 0;
                    }
                    let familiarStamina = familiarInfo.stamina - staminaCost * huntMin;
                    if (familiarStamina < 1) {
                        familiarStamina = 0;
                    }

                    // reply to user
                    let embed = new MessageEmbed()
                        .setColor(interaction.client.colors.green)
                        .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_START'), iconURL: interaction.user.avatarURL() })
                        .setDescription(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_STARTED').format(familiarHappiness, familiarInfo.happiness, familiarStamina, familiarInfo.stamina))
                        .setThumbnail(`https://obelisk.club/pets/pet_img/${familiarInfo.img}.png`)
                        .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_HUNT_FOOTER') })
                        .setTimestamp(currentDate);
                    await interaction.editReply({ embeds: [embed] });

                    // update familiar info
                    let dateStr =
                        ("00" + currentDate.getDate()).slice(-2) + "/" +
                        ("00" + (currentDate.getMonth() + 1)).slice(-2) + "/" +
                        currentDate.getFullYear() + " " +
                        ("00" + currentDate.getHours()).slice(-2) + ":" +
                        ("00" + currentDate.getMinutes()).slice(-2) + ":" +
                        ("00" + currentDate.getSeconds()).slice(-2);
                    await interaction.client.databaseEditData("update users_pet set stamina = ?, happiness = ?, hunt_map = ?, hunt_duration = ?, exp_per_hunt = ?, hunt_minutes= ? where user_id = ? and pet_id = ?", [familiarStamina, familiarHappiness, mapID, dateStr, monsterXP, huntMin, interaction.user.id, familiarInfo.pet_id]);
                }
            } else if (interaction.options.getSubcommand() == 'evolve') {
                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_COMMAND_LOCKED"))], ephemeral: true });
                }

                // set on db user changing familiar 
                await interaction.client.databaseEditData("update users set changing_pet = 'true' where user_id = ?", [userInfo.user_id]);

                let familiarOneID = (interaction.options.getString('first-id')).toUpperCase();
                let familiarTwoID = (interaction.options.getString('second-id')).toUpperCase();
                let familiarThreeID = (interaction.options.getString('third-id')).toUpperCase();

                let familiarRaces = [];
                let familiarsRank = [];
                let familiarsStat = [];

                // check if familiar id is duplicate
                if (familiarOneID == familiarTwoID || familiarOneID == familiarThreeID || familiarTwoID == familiarThreeID) {
                    // find duplicate familiar id
                    let duplicateFamiliarID = "";
                    if (familiarOneID == familiarTwoID) {
                        duplicateFamiliarID = familiarOneID;
                    } else if (familiarOneID == familiarThreeID) {
                        duplicateFamiliarID = familiarOneID;
                    } else if (familiarTwoID == familiarThreeID) {
                        duplicateFamiliarID = familiarTwoID;
                    }
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_DUPLICATE_ID").format(duplicateFamiliarID))] });
                }

                // check if equipped familiar
                if ([familiarOneID, familiarTwoID, familiarThreeID].includes((userInfo.pet_id).toUpperCase())) {
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_EQUIPPED"))] });
                }


                // check if user pet
                let familiarInfos = await interaction.client.databaseSelectData('SELECT pet_id FROM users_pet where pet_id = ? or pet_id = ? or pet_id = ? and user_id = ?', [familiarOneID, familiarTwoID, familiarThreeID, interaction.user.id]);
                if (familiarInfos.length < 3) {
                    // find if any familiar id missing from familiarInfos
                    let missingFamiliarID = "";
                    let familiarList = [];
                    for (let i = 0; i < familiarInfos.length; i++) {
                        familiarList.push(familiarInfos[i].pet_id);
                        familiarRaces.push(familiarInfos[i].race);
                        familiarsRank.push((familiarInfos[i].img).split('_')[1])
                        familiarsStat.push((familiarInfos[i].stat).split('-')[0])
                    }
                    if (!familiarList.includes(familiarOneID)) {
                        missingFamiliarID += familiarOneID + "\n";
                    }
                    if (!familiarList.includes(familiarTwoID)) {
                        missingFamiliarID += familiarTwoID + "\n";
                    }
                    if (!familiarList.includes(familiarThreeID)) {
                        missingFamiliarID += familiarThreeID + "\n";
                    }
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_NOT_FOUND_LIST").format(missingFamiliarID))] });
                } else {
                    for (let i = 0; i < familiarInfos.length; i++) {
                        familiarRaces.push(familiarInfos[i].race);
                        familiarsRank.push((familiarInfos[i].img).split('_')[1])
                        familiarsStat.push((familiarInfos[i].stat).split('-')[0])
                    }
                }

                // check if familiar same race
                let allSameRace = familiarRaces.every((val, i, arr) => val === arr[0]);
                let allSameRank = familiarsRank.every((val, i, arr) => val === arr[0]);
                let allSameStat = familiarsStat.every((val, i, arr) => val === arr[0]);

                if (!allSameRace) {
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FAMILIAR_TYPE"))] });
                }

                if (!allSameRank) {
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FAMILIAR_RANK"))] });
                }

                if (!allSameStat) {
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FAMILIAR_STAT"))] });
                }

                let nextRank = familiarsRank[0] + 1;

                if (nextRank > 2) {
                    // familiar reached max rank
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_FAMILIAR_MAX_RANK"))] });
                }


                // send confirmation message
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_EVOLVE_CONFIRM").format(familiarOneID, familiarTwoID, familiarThreeID))], components: [rowYesNo] });
                // get user confirmation
                let confirmCollector = msg.createMessageComponentCollector({ time: 40000 });

                confirmCollector.on('collect', async (i) => {
                    await i.deferUpdate();
                    if (i.user.id !== interaction.user.id) {
                        return;
                    }

                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);

                    if (i.customId == "no") {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_EVOLVE_CANCEL"))] });
                    } else {
                        // remove familiars id from users_pet
                        await interaction.client.databaseEditData('delete from users_pet where pet_id = ? or pet_id = ? or pet_id = ? and user_id = ?', [familiarOneID, familiarTwoID, familiarThreeID, interaction.user.id]);
                        // generate new familiar 
                        let newFamiliarID = "";
                        try {
                            newFamiliarID = await utility.generateUniqueCode(interaction.client, 'users_pet');
                        } catch (error) {
                            throw error;
                        }

                        let selectedFamiliar = familiarInfos[i].race;
                        let selectedStat = (familiarInfos[i].stat).split("-")[0];

                        await interaction.client.databaseEditData('insert into users_pet (pet_id, user_id, name, race, stat, img) values (?, ?, ?, ?, ?, ?)', [newFamiliarID, interaction.user.id, selectedFamiliar, selectedFamiliar, `${selectedStat}-${nextRank}`, `${selectedFamiliar}_${nextRank}`]);

                        let embed = new MessageEmbed()
                            .setColor(interaction.client.colors.green)
                            .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: "ID", value: newFamiliarID, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: selectedFamiliar, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: selectedFamiliar, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `100/100`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `100/100`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${selectedStat} +${nextRank}](https://obelisk.club/pets/pet_img/${selectedFamiliar}_${nextRank}.png)`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: "0", inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: "0", inline: true }
                            )
                            .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_REROLL_SUCCESS') })
                            .setThumbnail(`https://obelisk.club/pets/pet_img/${selectedFamiliar}_${nextRank}.png`);
                        await interaction.editReply({ embeds: [embed] })
                    }
                });
            } else if (interaction.options.getSubcommand() == 'rename') {
                let name = utility.titleCase(interaction.options.getString('name'));
                let familiarID = (interaction.options.getString('id')).toUpperCase();
                let renameCost = 1000;

                // check if user pet
                let familiarInfo = await interaction.client.databaseSelectData('select * from familiars where user_id = ? and pet_id = ?', [interaction.user.id, familiarID]);
                if (familiarInfo.length == 0) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_NOT_FOUND"))] });
                }

                // check if has enough gold
                if (userInfo.gold < renameCost) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_NO_GOLD").format(renameCost))] });
                }

                // get confirmation

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_RENAME_CONFIRM").format(renameCost, familiarInfo[0].name, name))], components: [rowYesNo] });

                let confirmCollector = msg.createMessageComponentCollector({ time: 40000 });

                confirmCollector.on('collect', async (i) => {
                    await i.deferUpdate();
                    if (i.user.id !== interaction.user.id) {
                        return;
                    }

                    if (i.customId == 'no') {
                        return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_RENAME_CANCEL"))], components: [] });
                    } else {
                        // reload user data
                        userInfo = await interaction.client.databaseSelectData('select * from users where user_id = ?', [interaction.user.id]);
                        userInfo = userInfo[0];

                        // check if has enough gold
                        if (userInfo.gold < renameCost) {
                            return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "ERROR_NO_GOLD").format(renameCost))] });
                        }

                        // update user gold
                        await interaction.client.databaseEditData('update users set gold = gold - ? where user_id = ?', [renameCost, interaction.user.id]);

                        // update familiar name
                        await interaction.client.databaseEditData('update users_pet set name = ? where user_id = ? and pet_id = ?', [name, interaction.user.id, familiarID]);

                        await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_RENAME_SUCCESS").format(familiarInfo[0].name, name))], components: [] });
                    }
                });
            } else if (interaction.options.getSubcommand() == 'favorite') {
                let option = interaction.options.getString('option');
                let familiarID = (interaction.options.getString('id')).toUpperCase();

                // check if user pet 
                let familiarInfo = await interaction.client.databaseSelectData('select * from familiars where user_id = ? and pet_id = ?', [interaction.user.id, familiarID]);
                if (familiarInfo.length == 0) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_NOT_FOUND"))] });
                }

                if (option == 'add') {
                    await interaction.client.databaseEditData('update users_pet set favorite = 1 where pet_id = ?', [familiarID]);
                } else {
                    await interaction.client.databaseEditData('update users_pet set favorite = 0 where pet_id = ?', [familiarID]);
                }
            } else if (interaction.options.getSubcommand() == 'reroll') {
                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_COMMAND_LOCKED"))], ephemeral: true });
                }

                // set on db user changing familiar 
                await interaction.client.databaseEditData("update users set changing_pet = 'true' where user_id = ?", [userInfo.user_id]);

                let familiarOneID = (interaction.options.getString('first-id')).toUpperCase();
                let familiarTwoID = (interaction.options.getString('second-id')).toUpperCase();
                let familiarThreeID = (interaction.options.getString('third-id')).toUpperCase();

                // check if familiar id is duplicate
                if (familiarOneID == familiarTwoID || familiarOneID == familiarThreeID || familiarTwoID == familiarThreeID) {
                    // find duplicate familiar id
                    let duplicateFamiliarID = "";
                    if (familiarOneID == familiarTwoID) {
                        duplicateFamiliarID = familiarOneID;
                    } else if (familiarOneID == familiarThreeID) {
                        duplicateFamiliarID = familiarOneID;
                    } else if (familiarTwoID == familiarThreeID) {
                        duplicateFamiliarID = familiarTwoID;
                    }
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_DUPLICATE_ID").format(duplicateFamiliarID))] });
                }

                // check if equipped familiar
                if ([familiarOneID, familiarTwoID, familiarThreeID].includes((userInfo.pet_id).toUpperCase())) {
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_EQUIPPED"))] });
                }


                // check if user pet
                let familiarInfos = await interaction.client.databaseSelectData('SELECT pet_id FROM users_pet where pet_id = ? or pet_id = ? or pet_id = ? and user_id = ?', [familiarOneID, familiarTwoID, familiarThreeID, interaction.user.id]);
                if (familiarInfos.length < 3) {
                    // find if any familiar id missing from familiarInfos
                    let missingFamiliarID = "";
                    let familiarList = [];
                    for (let i = 0; i < familiarInfos.length; i++) {
                        familiarList.push(familiarInfos[i].pet_id);
                    }
                    if (!familiarList.includes(familiarOneID)) {
                        missingFamiliarID += familiarOneID + "\n";
                    }
                    if (!familiarList.includes(familiarTwoID)) {
                        missingFamiliarID += familiarTwoID + "\n";
                    }
                    if (!familiarList.includes(familiarThreeID)) {
                        missingFamiliarID += familiarThreeID + "\n";
                    }
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_NOT_FOUND_LIST").format(missingFamiliarID))] });
                }

                // send confirmation message
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_REROLL_CONFIRM").format(familiarOneID, familiarTwoID, familiarThreeID))], components: [rowYesNo] });
                // get user confirmation
                let confirmCollector = msg.createMessageComponentCollector({ time: 40000 });

                confirmCollector.on('collect', async (i) => {
                    await i.deferUpdate();
                    if (i.user.id !== interaction.user.id) {
                        return;
                    }
                    // set on db user not changing familiar 
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                    if (i.customId == 'no') {
                        return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_REROLL_CANCEL"))], components: [] });
                    } else if (i.customId == 'yes') {
                        // remove familiars id from users_pet
                        await interaction.client.databaseEditData('delete from users_pet where pet_id = ? or pet_id = ? or pet_id = ? and user_id = ?', [familiarOneID, familiarTwoID, familiarThreeID, interaction.user.id]);
                        // generate new familiar 
                        let newFamiliarID = "";
                        try {
                            newFamiliarID = await utility.generateUniqueCode(interaction.client, 'users_pet');
                        } catch (error) {
                            throw error;
                        }

                        let familiarNames = ['Belltail', 'Dyneema', 'Floret', 'Grug', 'Iratus', 'Lluvia',
                            'Mystopia', 'Ryobi', 'Turmaloid', 'Volant'];

                        let stats = ['str', 'def', 'intel', 'dex', 'agi', 'crit', 'luck'];

                        let selectedFamiliar = utility.weightedRandom(familiarNames, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
                        let selectedStat = utility.weightedRandom(stats, [1, 1, 1, 1, 1, 1, 1]);

                        await interaction.client.databaseEditData('insert into users_pet (pet_id, user_id, name, race, stat, img) values (?, ?, ?, ?, ?, ?)', [newFamiliarID, interaction.user.id, selectedFamiliar, selectedFamiliar, `${selectedStat}-1`, `${selectedFamiliar}_1`]);

                        let embed = new MessageEmbed()
                            .setColor(interaction.client.colors.green)
                            .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                            .addFields(
                                { name: "ID", value: newFamiliarID, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: selectedFamiliar, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: selectedFamiliar, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `100/100`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `100/100`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${selectedStat} +1](https://obelisk.club/pets/pet_img/${selectedFamiliar}_1.png)`, inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: "0", inline: true },
                                { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: "0", inline: true }
                            )
                            .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_REROLL_SUCCESS') })
                            .setThumbnail(`https://obelisk.club/pets/pet_img/${selectedFamiliar}_1.png`);
                        await interaction.editReply({ embeds: [embed] })
                    }
                    confirmCollector.stop();
                })

            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}


async function familiarListView(interaction, serverSettings, msg, familiarsInfo) {
    try {
        let index = 0;
        var maxPages = familiarsInfo.length - 1;

        const collector = msg.createMessageComponentCollector({ time: 40000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.user.id !== interaction.user.id) return;

            if (["left", "right"].includes(i.customId)) {
                collector.resetTimer({ time: 40000 });
                if (i.customId === 'left')
                    index--;
                else if (i.customId === 'right')
                    index++;
                if (index > maxPages)
                    index = 0;
                if (index < 0)
                    index = maxPages;
                let embed = new MessageEmbed()
                    .setColor(interaction.client.colors.green)
                    .setAuthor({ name: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_LIST'), iconURL: interaction.user.avatarURL() })
                    .addFields(
                        { name: "ID", value: familiarsInfo[index].pet_id, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'NAME'), value: familiarsInfo[index].name, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'RACE'), value: familiarsInfo[index].race, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'HAPPINESS'), value: `${familiarsInfo[index].happiness}/${familiarsInfo[index].max_happiness}`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAMINA'), value: `${familiarsInfo[index].stamina}/${familiarsInfo[index].max_stamina}`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'STAT'), value: `[${(familiarsInfo[index].stat).replaceAll('-', ' +')}](https://obelisk.club/pets/pet_img/${familiarsInfo[index].img}.png)`, inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'EXP'), value: familiarsInfo[index].exp.toString(), inline: true },
                        { name: interaction.client.getWordLanguage(serverSettings.lang, 'LEVEL'), value: familiarsInfo[index].level.toString(), inline: true }
                    )
                    .setFooter({ text: interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_PAGE').format(index + 1, maxPages + 1) })
                    .setThumbnail(`https://obelisk.club/pets/pet_img/${familiarsInfo[index].img}.png`);
                await interaction.editReply({ embeds: [embed] });
            }

        });

        collector.on('end', collected => {
            interaction.editReply({ components: [] })
        });
    } catch (error) {
        let errorID = await errorLog.error(error, interaction);
        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
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

const rowArrow = new MessageActionRow()
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
            .setStyle('PRIMARY')
    );