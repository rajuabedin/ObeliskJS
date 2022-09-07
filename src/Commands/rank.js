const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const utility = require('../Utility/utils');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your rank!')
        .addSubcommand(subcommand => subcommand
            .setName('your')
            .setDescription('Check your rank!'))
        .addSubcommand(subcommand => subcommand
            .setName('top_50')
            .setDescription('Check class based rank!')
            .addStringOption(option => option
                .setName('type')
                .setDescription('Type')
                .setRequired(true)
                .addChoices(
                    { name: 'level', value: 'level' },
                    { name: 'kills', value: 'kills' },
                    { name: 'honor', value: 'honor' },
                    { name: 'gold', value: 'gold' },
                    { name: 'pvp', value: 'pvp' },
                    { name: 'l_kills', value: 'l_kills' },
                    { name: 'h_kills', value: 'h_kills' }
                ))
            .addStringOption(option => option
                .setName('class')
                .setDescription('Class name')
                .addChoices(
                    { name: 'Warrior', value: 'Warrior' },
                    { name: 'Mage', value: 'Mage' },
                    { name: 'Assassin', value: 'Assassin' },
                    { name: 'Tank', value: 'Tank' },
                ))),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            if (interaction.options.getSubcommand() === 'your') {
                let level = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE level>=(SELECT level FROM users WHERE user_id=?) and exp>=(SELECT exp FROM users WHERE user_id=?)", [interaction.user.id, interaction.user.id]);
                let honor = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE honor>=(SELECT honor FROM users WHERE user_id=?)", [interaction.user.id]);
                let gold = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE gold>=(SELECT gold FROM users WHERE user_id=?)", [interaction.user.id]);
                let pvp = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE pvp>=(SELECT pvp FROM users WHERE user_id=?)", [interaction.user.id]);
                let kills = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE kills>=(SELECT kills FROM users WHERE user_id=?)", [interaction.user.id]);
                let l_kills = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE l_kills>=(SELECT l_kills FROM users WHERE user_id=?)", [interaction.user.id]);
                let h_kills = await interaction.client.databaseSelectData("SELECT COUNT(*) AS rank FROM users WHERE h_kills>=(SELECT h_kills FROM users WHERE user_id=?)", [interaction.user.id]);

                let embed = new MessageEmbed()
                    .setColor(interaction.client.colors.green)
                    .setTitle(`${interaction.user.username} ${interaction.client.getWordLanguage(serverSettings.lang, 'RANKS')}`)
                    .setDescription(`${interaction.client.getWordLanguage(serverSettings.lang, 'RANKING_USER_ALL')}\n<:arrow:784920895558254632> **Gold Rank [${gold[0].rank > 0 ? gold[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.gold)}
                    <:arrow:784920895558254632> **Honor Rank [${honor[0].rank > 0 ? honor[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.honor)}
                    <:arrow:784920895558254632> **PVP Rank [${pvp[0].rank > 0 ? pvp[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.pvp)}
                    <:arrow:784920895558254632> **Level Rank [${level[0].rank > 0 ? level[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.level)}
                    <:arrow:784920895558254632> **Kills Rank [${kills[0].rank > 0 ? kills[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.kills)}
                    <:arrow:784920895558254632> **L Kills Rank [${l_kills[0].rank > 0 ? l_kills[0].rank : "N/A"}](https://obelisk.club/)** - ${utility.nFormatterNumberToString(userInfo.l_kills)}`
                    )
                    .setThumbnail(interaction.user.avatarURL())
                    .setImage("https://obelisk.club/npc/rank.png")
                    .setTimestamp(new Date())
                await interaction.editReply({ embeds: [embed] });

            } else if (interaction.options.getSubcommand() === 'top_50') {
                let classOption = interaction.options.getString('class');
                let typeOption = interaction.options.getString('type');

                let rankData = [];
                let userRank = [];
                if (classOption == null) {
                    if (typeOption === "level") {
                        rankData = await interaction.client.databaseSelectData(`SELECT username,discord_tag,user_id,level,exp, FIND_IN_SET( exp, ( SELECT GROUP_CONCAT( exp ORDER BY level DESC, exp DESC ) FROM users ) ) AS rank FROM users ORDER BY level DESC, exp DESC limit 50`);
                    } else {
                        rankData = await interaction.client.databaseSelectData(`SELECT username,discord_tag,user_id, ${typeOption}, FIND_IN_SET( ${typeOption}, ( SELECT GROUP_CONCAT( ${typeOption} ORDER BY ${typeOption} DESC ) FROM users ) ) AS rank FROM users ORDER BY ${typeOption} DESC limit 50`);
                    }
                } else {
                    if (typeOption === "level") {
                        rankData = await interaction.client.databaseSelectData(`SELECT username,user_id,class,level,exp, FIND_IN_SET( exp, ( SELECT GROUP_CONCAT( exp ORDER BY level DESC, exp DESC ) FROM users ) ) AS rank FROM users WHERE class = ? ORDER BY level DESC, exp DESC limit 50`, [classOption]);
                    } else {
                        rankData = await interaction.client.databaseSelectData(`SELECT username,user_id,class, ${typeOption}, FIND_IN_SET( ${typeOption}, ( SELECT GROUP_CONCAT( ${typeOption} ORDER BY ${typeOption} DESC ) FROM users ) ) AS rank FROM users WHERE class = ? ORDER BY ${typeOption} DESC limit 50`, [classOption]);
                    }
                }

                if (classOption === userInfo.class) {
                    if (typeOption === "level") {
                        userRank = await interaction.client.databaseSelectData(`SELECT COUNT(*) AS rank FROM users WHERE level>=(SELECT level FROM users WHERE user_id=?) and exp>=(SELECT exp FROM users WHERE user_id=?)`, [interaction.user.id, interaction.user.id]);
                    } else {
                        userRank = await interaction.client.databaseSelectData(`SELECT COUNT(*) AS rank FROM users WHERE ${typeOption}>=(SELECT ${typeOption} FROM users WHERE user_id=?)`, [interaction.user.id]);
                    }
                }



                var itemsPerPage = 10;
                var newRankData = [];
                var stringData = ""

                for (var i = 0; i < rankData.length; i++) {
                    if (stringData === "" && userRank.length > 0) {
                        stringData = interaction.client.getWordLanguage(serverSettings.lang, 'RANKING_USER').format(userRank[0].rank, utility.nFormatterNumberToString(userInfo[typeOption]), utility.titleCase(typeOption));
                    } else if (stringData === "" && userRank.length < 1) {
                        if (classOption == null) {
                            stringData = interaction.client.getWordLanguage(serverSettings.lang, 'RANKING_TYPE').format(utility.titleCase(typeOption));
                        } else {
                            stringData = interaction.client.getWordLanguage(serverSettings.lang, 'RANKING_TYPE_CLASS').format(utility.titleCase(classOption), utility.titleCase(typeOption));
                        }
                    }

                    if (rankData[i].user_id === interaction.user.id) {
                        stringData += `\n[**⦿ ${interaction.client.getWordLanguage(serverSettings.lang, 'RANK_L')} ${i + 1}** - ${rankData[i].username} ${utility.nFormatterNumberToString(rankData[i][typeOption])}](https://obelisk.club/)`
                    } else {
                        stringData += `\n**⦿ ${interaction.client.getWordLanguage(serverSettings.lang, 'RANK_L')} ${i + 1}** - ${rankData[i].username} ${utility.nFormatterNumberToString(rankData[i][typeOption])}`;
                    }

                    if (((i + 1) % itemsPerPage) == 0 || i === rankData.length - 1) {
                        newRankData.push(stringData);
                        stringData = ""
                    }
                }

                rankData = newRankData;

                var maxPages = rankData.length;

                let embed = new MessageEmbed()
                    .setColor(interaction.client.colors.blue)
                    .setAuthor({
                        name: interaction.client.getWordLanguage(serverSettings.lang, "RANKING").format(utility.titleCase(typeOption)),
                        iconURL: interaction.user.avatarURL()
                    })
                    .setDescription(rankData[0])
                    .setFooter({
                        text: interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages),
                    })
                    .setImage("https://obelisk.club/npc/rank.png")

                await interaction.editReply({ embeds: [embed], components: [rowButtonLeftRight] });
                utility.paginationHandlerBottomImage(interaction.client.getWordLanguage(serverSettings.lang, "RANKING").format(utility.titleCase(typeOption)),
                    userInfo, interaction, serverSettings, rankData, msg, "https://obelisk.club/npc/rank.png")
            }

        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

const rowButtonLeftRight = new MessageActionRow()
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