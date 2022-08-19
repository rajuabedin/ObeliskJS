const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('familiar')
        .setDescription('Check your familiars!')
        .addSubcommand(subcommand => subcommand
            .setName('info')
            .setDescription('Check your equipped familiar!'))
        .addSubcommand(subcommand => subcommand
            .setName('equip')
            .setDescription('Equip a familiar!'))
        .addSubcommand(subcommand => subcommand
            .setName('un-equip')
            .setDescription('Un-equip a familiar!'))
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List all familiars!')
            .addStringOption(option => option
                .setName('type')
                .setDescription('Type of familiar to list.')
                .addChoices(
                    { name: 'all', value: 'all' },
                    { name: "Belltail", value: "belltail" },
                    { name: "Dyneema", value: "dyneema" },
                    { name: 'Floret', value: 'floret' },
                    { name: 'Grug', value: 'grug' },
                    { name: 'Iratus', value: 'iratus' },
                    { name: 'Lluvia', value: 'lluvia' },
                    { name: 'Mystopia', value: 'mystopia' },
                    { name: 'Ryobi', value: 'ryobi' },
                    { name: 'Turmaloid', value: 'turmaloid' },
                    { name: 'Volant', value: 'volant' }
                ))
            .addStringOption(option => option
                .setName('stat')
                .setDescription('Stat to sort by.')
                .addChoices(
                    { name: 'all', value: 'all' },
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
                .setDescription('The map to hunt on!')))
        .addSubcommand(subcommand => subcommand
            .setName('evolve')
            .setDescription('Evolve a familiar!')),

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
                await interaction.reply({ embeds: [interaction.client.redEmbed(`Check your equipped familiar!`)], ephemeral: true });
            } else if (interaction.options.getSubcommand() == 'equip') {

                // check if already changing familiar
                if (userInfo.changing_pet == "true") {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_CHANGE_LOCKED"))], ephemeral: true });
                }

                let familiarInfo;

                // set on db user changing familiar 
                await interaction.client.databaseEditData("update users set changing_pet = 'true' where user_id = ?", [userInfo.user_id]);

                if (!['none', ''].includes(userInfo.pet_id)) {

                    familiarInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                    familiarInfo = familiarInfo[0];

                    // check if familiar in hunt
                    if (familiarInfo.hunt_map !== "null") {
                        await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_HUNT_LOCKED"))], ephemeral: true });
                    }


                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_CHANGE_E'))], components: [rowYesNo] });
                    const collectorConfirm = msg.createMessageComponentCollector({ time: 25000 });

                    collectorConfirm.on('collect', async i => {
                        await i.defferUpdate();
                        if (i.user.id !== interaction.user.id) {
                            return;
                        }
                        if (i.customId === 'no') {
                            await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                            return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_CHANGE_CANCEL'))], components: [] });
                        }
                    })

                }

                // show available familiars
                let familiarsInfo = await interaction.client.databaseSelectData('SELECT * FROM users_pet WHERE user_id = ?', [interaction.user.id]);
                if (familiarsInfo.length == 0) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NO'))], ephemeral: true });
                }

                let options = [{ label: "None", value: "none" }];

                for (let i = 0; i < familiarsInfo.length; i++) {
                    if (familiarsInfo[i].pet_id == userInfo.pet_id.toUpperCase()) {
                        options.push({
                            label: `<<E>> [${familiarsInfo[i].pet_id}] ${familiarsInfo[i].name} - ${familiarsInfo[i].stat}`,
                            value: i
                        });
                    } else {
                        options.push({
                            label: `[${familiarsInfo[i].pet_id}] ${familiarsInfo[i].name} - ${familiarsInfo[i].stat}`,
                            value: i
                        });
                    }
                }

                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('select')
                            .setPlaceholder('Select a familiar')
                            .addOptions(options),
                    );

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'SELECT_FAMILIAR'))], components: [row] });

                const collectorChange = msg.createMessageComponentCollector({ time: 25000 });

                collectorChange.on('collect', async i => {
                    i.defferUpdate();
                    if (i.user.id !== interaction.user.id) {
                        return;
                    }
                    collectorChange.resetTimer({ time: 15000 });

                    if (familiarsInfo[i.value].pet_id === userInfo.pet_id.toUpperCase()) {
                        await interaction.followUp({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_EQUIPPED'))], ephemeral: true });
                    } else {
                        if (i.value !== 'none') {
                            familiarInfo = familiarsInfo[i.value];
                        } else {
                            familiarInfo = {
                                pet_id: 'none',
                                name: 'None',
                                stat: 'None-None'
                            }
                        }
                        await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_SELECTED'))], components: [] });
                        collectorChange.stop();

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

                        await interaction.client.databaseEditData("update users set hp = ?, mp = ?, attack = ?, armor = ?, current_hp = ? , current_mp = ?, pet_id = ? where user_id = ?",
                            [hp, mp, atk, def, current_hp, current_mp, familiarInfo.pet_id, userInfo.user_id]);
                    }
                })

                collectorChange.on('end', async i => {
                    await interaction.client.databaseEditData("update users set changing_pet = 'false' where user_id = ?", [userInfo.user_id]);
                })

            } else if (interaction.options.getSubcommand() == 'un-equip') {
                if (userInfo.changing_pet == "true") {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_CHANGE_LOCKED"))], ephemeral: true });
                }

                if (['none', ''].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NO'))], ephemeral: true });
                }

                let familiarInfo = {
                    pet_id: 'none',
                    name: 'None',
                    stat: 'None-None'
                }

                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_REMOVED').format(userInfo.pet_id))], components: [] });

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

                await interaction.client.databaseEditData("update users set hp = ?, mp = ?, attack = ?, armor = ?, current_hp = ? , current_mp = ?, pet_id = ? where user_id = ?",
                    [hp, mp, atk, def, current_hp, current_mp, familiarInfo.pet_id, userInfo.user_id]);

            } else if (interaction.options.getSubcommand() == 'list') {
                await interaction.reply({ embeds: [interaction.client.redEmbed(`Familiar list!`)], ephemeral: true });
            } else if (interaction.options.getSubcommand() == 'hunt') {
                if (userInfo.changing_pet == "true") {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_CHANGE_LOCKED"))], ephemeral: true });
                }
            } else if (interaction.options.getSubcommand() == 'evolve') {
                if (userInfo.changing_pet == "true") {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_CHANGE_LOCKED"))], ephemeral: true });
                }
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