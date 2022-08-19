const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equipments')
        .setDescription('List of all equipments.')
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View equipments.')
            .addStringOption(option => option
                .setName('type')
                .setDescription('Type of equipment to list.')
                .setRequired(true)
                .addChoices(
                    { name: 'Weapon', value: 'weapon' },
                    { name: 'Armor', value: 'armor' },
                )))
        .addSubcommand(subcommand => subcommand
            .setName('craft')
            .setDescription('Craft equipments. - Currently unavailable')),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            if (interaction.options.getSubcommand() === "view") {
                let equipmentsList = await interaction.client.databaseSelectData("SELECT * FROM created_eqp where user_id = ? and type = ? order by class", [userInfo.user_id, interaction.options.getString('type')]);
                if (equipmentsList[0] == undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'EQUIPMENT_NONE'))], ephemeral: true });
                }


                var itemsPerPage = 2;
                var newEqupmentList = [];
                var stringData = ""

                for (var i = 0; i < equipmentsList.length; i++) {
                    stringData += "`" + equipmentsList[i].item_id + `\` **${equipmentsList[i].name}** \n\`\`\`css\nType: ${equipmentsList[i].type}\tClass: ${equipmentsList[i].class}\nRank: ${equipmentsList[i].rank}\tLvl: ${equipmentsList[i].min_lvl}\nGems: ${equipmentsList[i].current_gem}\nATK: ${equipmentsList[i].attack}\tDEF: ${equipmentsList[i].attack}\nHP: ${equipmentsList[i].hp + equipmentsList[i].gemHP}\tMP: ${equipmentsList[i].mp + equipmentsList[i].gemMP}\nBoosted: ${equipmentsList[i].boosted}\tValue: ${equipmentsList[i].boosted_by}\`\`\`\n`
                    if (((i + 1) % itemsPerPage) == 0 || i === equipmentsList.length - 1) {
                        newEqupmentList.push(stringData);
                        stringData = ""
                    }
                }

                equipmentsList = newEqupmentList;

                var maxPages = equipmentsList.length;

                var embed = interaction.client.bluePagesEmbed(equipmentsList[0], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format(interaction.client.getWordLanguage(serverSettings.lang, "EQUIPMENT")), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages));
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, equipmentsList, msg);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }
            }


        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}


function buttonHandler(userInfo, interaction, serverSettings, equipmentList, msg) {
    let index = 0;
    var maxPages = equipmentList.length - 1;


    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
        await i.defferUpdate();
        if (i.user.id !== interaction.user.id) return;
        collector.resetTimer({ time: 15000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesEmbed(equipmentList[index], interaction.client.getWordLanguage(serverSettings.lang, 'S_INVENTORY').format(interaction.client.getWordLanguage(serverSettings.lang, "EQUIPMENT")), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
        await interaction.editReply({ embeds: [embed], components: [row] });
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

}

const row = new MessageActionRow()
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