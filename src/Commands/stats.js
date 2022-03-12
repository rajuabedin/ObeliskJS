const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Command to open your stats panel.'),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            var agi = userInfo.agi;
            var str = userInfo.str;
            var dex = userInfo.dex;
            var vit = userInfo.def;
            var intel = userInfo.intel;
            var atk = userInfo.attack;
            var crit = userInfo.crit;
            var luck = userInfo.luck;
            var deff = userInfo.armor;

            var interactionReplied = false;
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
                if (interactionReplied) {
                    await interaction.editReply(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                } else {
                    await interaction.reply(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                }

            } else {
                if (interactionReplied) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                }
                errorLog.error(data.error, { 'command_name': interaction.commandName });
            }
        } catch (error) {
            if (interaction.replied) {
                await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
            }
            errorLog.error(error.message, { 'command_name': interaction.commandName });
        }
    }
}