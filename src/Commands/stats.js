const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Command to open your stats panel.')
        .addSubcommand(subcommand => subcommand
            .setName("info", "info")
            .setDescription("Command to open your stats panel."))
        .addSubcommand(subcommand => subcommand
            .setName("add", "add")
            .setDescription("Add points to stats")
            .addStringOption(option => option
                .setName("stat")
                .setDescription("Selecet where you want to allocate the point/s")
                .addChoice("Agility", "agi")
                .addChoice("Strength", "str")
                .addChoice("Dexterity", "dex")
                .addChoice("Vitality", "def")
                .addChoice("Intelligence", "intel")
                .addChoice("Critic", "crit")
                .addChoice("Luck", "luck")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("quantity", "quantity")
                .setDescription("Specify the value")
            ))
    ,

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            function nFormatterNumberToString(num, digits) {
                var si = [
                    { value: 1, symbol: "" },
                    { value: 1E3, symbol: "k" },
                    { value: 1E6, symbol: "M" },
                    { value: 1E9, symbol: "G" },
                    { value: 1E12, symbol: "T" },
                    { value: 1E15, symbol: "P" },
                    { value: 1E18, symbol: "E" }
                ];
                var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
                var i;
                for (i = si.length - 1; i > 0; i--) {
                    if (num >= si[i].value) {
                        break;
                    }
                }
                return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }

            function isNumeric(num) {
                return !isNaN(num)
            }

            function nFormatterStringToNumber(val) {
                if (isNumeric(val)) {
                    return parseInt(val);
                }

                multiplier = val.substr(-1).toLowerCase();
                if (multiplier == "k")
                    return parseFloat(val) * 1000;
                else if (multiplier == "m")
                    return parseFloat(val) * 1000000;
                else if (multiplier == "b")
                    return parseFloat(val) * 100000000;
                else
                    return "error"
            }

            var agi = userInfo.agi;
            var str = userInfo.str;
            var dex = userInfo.dex;
            var vit = userInfo.def;
            var intel = userInfo.intel;
            var atk = userInfo.attack;
            var crit = userInfo.crit;
            var luck = userInfo.luck;
            var deff = userInfo.armor;
            if (interaction.options.getSubcommand() === "add") {
                var statsToAdd = interaction.options.getString("stat");
                var quantity = interaction.options.getString("quantity");
                let statsName = {
                    agi: "Agility",
                    str: "Strength",
                    dex: "Dexterity",
                    def: "Vitality",
                    intel: "Intelligence",
                    crit: "Critic",
                    luck: "Luck"
                }
                if (quantity == null) {
                    quantity = 1;
                } else {
                    quantity = nFormatterStringToNumber(quantity);
                    if (quantity == "error" || quantity < 1) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_QUANTITY'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                }

                var data = await fetch(`https://obelisk.club/update_status.php?id=${interaction.user.id}&status=${statsToAdd}&t=${quantity}`, {
                    method: 'POST'
                })
                    .then(response => response.text())
                    .then(data => { return data });

                if (data !== "Updated") {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                } else {
                    await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'STATS_ADDED').format(quantity, statsName[statsToAdd]), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESSFUL'))], ephemeral: true });
                }

                if (['def', 'intel'].includes(statsToAdd)) {
                    if (userInfo.eqp_armor !== "None") {
                        let eqArmor = await fetch(`https://obelisk.club/equip_item.php?id=${userInfo.eqp_armor}&user_id=${interaction.user.id}`, {
                            method: 'POST'
                        })
                            .then(response => response.text())
                            .then(data => { return data });
                    }
                    if (userInfo.eqp_weapon !== "None") {
                        let eqWeapon = await fetch(`https://obelisk.club/equip_item.php?id=${userInfo.eqp_weapon}&user_id=${interaction.user.id}`, {
                            method: 'POST'
                        })
                            .then(response => response.text())
                            .then(data => { return data });

                    }
                    if (!['none', ''].includes(userInfo.pet_id)) {
                        var petInfo = interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                        petInfo = petInfo[0];
                        if (petInfo !== undefined) {
                            let response = ""
                            var petStatData = petInfo.stat.split("-");
                            if (petStatData[0] === "def") {
                                let hp = 0;
                                if (userInfo.level < 30) {
                                    hp = 30 * parseInt(petStatData[1]);
                                } else {
                                    hp = userInfo.level * parseInt(petStatData[1]);
                                }
                                response = await fetch(`https://obelisk.club/update_max_hp_mp.php?hp=${hp}&id=${interaction.user.id}`, {
                                    method: 'POST'
                                })
                                    .then(response => response.text())
                                    .then(data => { return data });
                            } else if (petStatData[0] === "intel") {
                                let mp = 15 * parseInt(petStatData[1]);
                                response = await fetch(`https://obelisk.club/update_max_hp_mp.php?mp=${mp}&id=${interaction.user.id}`, {
                                    method: 'POST'
                                })
                                    .then(response => response.text())
                                    .then(data => { return data });
                            }
                        }
                    }
                }
            } else {
                var interactionReplied = false;
                // familiar stats
                if (!['none', ''].includes(userInfo.pet_id)) {
                    var petInfo = interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id.toUpperCase()]);
                    petInfo = petInfo[0];
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
                            await interaction.client.databaseEditData("update users set pet_id = 'null' where user_id = ?", [interaction.user.id])
                            if (interactionReplied) {
                                await interaction.editReply({
                                    embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                                })
                            } else {
                                interactionReplied = true;
                                await interaction.editReply({ embeds: [interaction.client.yellowEmbed(interaction.client.getWordLanguage(serverSettings.lang, "FAMILIAR_UNEQUIPPED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: [] })
                            }
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }

                const requestBody = {
                    user_id: interaction.user.id,
                    pfp_img: interaction.user.avatarURL(),
                    username: interaction.user.username,
                    class: userInfo.class,
                    str: str.toString(),
                    vit: vit.toString(),
                    luck: luck.toString(),
                    dex: dex.toString(),
                    agi: agi.toString(),
                    crit: crit.toString(),
                    intel: intel.toString(),
                    att: atk.toString(),
                    deff: deff.toString(),
                    hp: userInfo.hp.toString(),
                    mp: userInfo.mp.toString(),
                    chp: userInfo.current_hp.toString(),
                    cmp: userInfo.current_mp.toString(),
                    free_stat_points: userInfo.free_stat_points.toString(),
                    class: userInfo.class
                }

                var data = await fetch(`https://api.obelisk.club/ObeliskAPI/stats`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => response.json())
                    .then(data => { return data });
                if (data.success == true) {
                    await interaction.editReply(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                } else {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                    errorLog.custom(data.error, interaction);
                }
            }


        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}