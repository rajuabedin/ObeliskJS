const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Opens the map!')
        .addIntegerOption(option => option
            .setName('check')
            .setDescription('The ID of the map you want to get info!'))
        .addIntegerOption(option => option
            .setName('teleport')
            .setDescription('The ID of the map you want to teleport!')),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            if (interaction.options.getInteger('check') === null && interaction.options.getInteger('teleport') === null) {
                let mapData = await interaction.client.databaseSelectData("SELECT * FROM area where visible = 'true' ORDER BY id ASC");
                let userAvailableMaps = userInfo.areas.split(';');
                let mapList = [];
                let stringData = `${interaction.client.getWordLanguage(serverSettings.lang, 'MAP_CURRENT').format(userInfo.area_tag)}`;
                var itemsPerPage = 4;
                let tempMaterials = [];
                let tempMaterialsString = [];
                let availableMaterials = "";
                for (let i = 0; i < mapData.length; i++) {
                    availableMaterials = "[";
                    if (mapData[i].materials !== "None") {
                        tempMaterials = mapData[i].materials.split(';');
                        for (let j = 0; j < tempMaterials.length; j++) {
                            tempMaterialsString = tempMaterials[j].split('-');
                            availableMaterials += tempMaterialsString[0].replaceAll('_', ' ');
                            if (j < tempMaterials.length - 1)
                                availableMaterials += ", ";
                        }
                    } else {
                        availableMaterials = interaction.client.getWordLanguage(serverSettings.lang, 'NO_AVAILABLE_DROPS');
                    }
                    availableMaterials += "]";
                    if (userAvailableMaps.includes(mapData[i].tag.replaceAll('_', ' '))) {
                        stringData += `\n<:ok_128px:814090797942439936> \`ID ${mapData[i].id}\` **(${mapData[i].tag.replaceAll('_', ' ')})** ${mapData[i].name} Lv ${mapData[i].min_lvl} - ${mapData[i].max_lvl}
                    ${interaction.client.getWordLanguage(serverSettings.lang, "AVAILABLE_MATERIALS")}: ${availableMaterials}\n`;
                    } else {
                        stringData += `\n<:delete:814090797909409802> \`ID ${mapData[i].id}\` **(${mapData[i].tag.replaceAll('_', ' ')})** ${mapData[i].name} Lv ${mapData[i].min_lvl} - ${mapData[i].max_lvl}
                    ${interaction.client.getWordLanguage(serverSettings.lang, "AVAILABLE_MATERIALS")}: ${availableMaterials}\n`;
                    }

                    if (((i + 1) % itemsPerPage) == 0 || i === mapData.length - 1) {
                        mapList.push(stringData);
                        stringData = `${interaction.client.getWordLanguage(serverSettings.lang, 'MAP_CURRENT').format(userInfo.area_tag)}`;
                    }
                }

                var maxPages = mapList.length;

                var embed = interaction.client.whitePagesImageBottomEmbed(mapList[0], interaction.client.getWordLanguage(serverSettings.lang, 'MAP_LIST'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages), "https://obelisk.club/npc/map.png");
                if (maxPages > 1) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, mapList, msg);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }
            } else if (interaction.options.getInteger('check') !== null) {
                let mapData = await interaction.client.databaseSelectData("select * from area where id = ? and visible = 'true'", [interaction.options.getInteger('check')]);
                // check if map is found
                if (mapData.length === 0) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'MAP_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    return;
                } else {
                    mapData = mapData[0];
                }
                // reply to the interaction with the map information
                let userAvailableMaps = userInfo.areas.split(';');
                let title = "";
                if (userAvailableMaps.includes(mapData.tag.replaceAll('_', ' '))) {
                    title += `\n<:ok_128px:814090797942439936> \`ID ${mapData.id}\` **(${mapData.tag.replaceAll('_', ' ')})** ${mapData.name} Lv ${mapData.min_lvl} - ${mapData.max_lvl}`;
                } else {
                    title += `\n<:delete:814090797909409802> \`ID ${mapData.id}\` **(${mapData.tag.replaceAll('_', ' ')})** ${mapData.name} Lv ${mapData.min_lvl} - ${mapData.max_lvl}`;
                }

                let monsterData = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ?", [mapData.tag]);

                let monsterList = [];
                let monsterMaterialList = [];
                let bossMonster = ""
                let tempMaterialsList = [];
                let tempMaterialsQuantityList = [];

                for (let i = 0; i < monsterData.length; i++) {
                    // get list of monsters 
                    if (!monsterList.includes(monsterData[i].name) && monsterData[i].rarity !== "Boss") {
                        monsterList.push(monsterData[i].name);
                    } else if (monsterData[i].rarity === "Boss") {
                        bossMonster = monsterData[i].name;
                    }

                    // get list of materials
                    tempMaterialsList = monsterData[i].drop_n_q.split(';');
                    for (let j = 0; j < tempMaterialsList.length; j++) {
                        tempMaterialsQuantityList = tempMaterialsList[j].split('-');
                        if (!monsterMaterialList.includes(tempMaterialsQuantityList[0].replaceAll('_', ' '))) {
                            monsterMaterialList.push(`${tempMaterialsQuantityList[0].replaceAll('_', ' ')}`);
                        }
                    }
                }

                let availableMaterials = "";
                if (mapData.materials !== "None") {
                    tempMaterials = mapData.materials.split(';');
                    for (let j = 0; j < tempMaterials.length; j++) {
                        tempMaterialsString = tempMaterials[j].split('-');
                        availableMaterials += tempMaterialsString[0].replaceAll('_', ' ');
                        if (j < tempMaterials.length - 1)
                            availableMaterials += ", ";
                    }
                } else {
                    availableMaterials = interaction.client.getWordLanguage(serverSettings.lang, 'NO_AVAILABLE_DROPS');
                }

                let embed = new MessageEmbed()
                    .setColor("0xfafafa")
                    .setTitle(title)
                    .setDescription(`**Boss:** \`${bossMonster}\`\n**${interaction.client.getWordLanguage(serverSettings.lang, "AVAILABLE_MONSTERS")}:** \`\`\`[${monsterList.join(', ')}]\`\`\`
                    **${interaction.client.getWordLanguage(serverSettings.lang, "AVAILABLE_MATERIALS")}:** \`\`\`[${monsterMaterialList.join(', ')}]\`\`\`
                    **${interaction.client.getWordLanguage(serverSettings.lang, "AVAILABLE_DROPS")}:** \`\`\`[${availableMaterials}]\`\`\``)
                    .setImage("https://obelisk.club/npc/map.png")

                await interaction.editReply({ embeds: [embed] });

            } else {
                let mapData = await interaction.client.databaseSelectData("select * from area where id = ? and visible = 'true'", [interaction.options.getInteger('teleport')]);
                // check if map is found
                if (mapData.length === 0) {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'MAP_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    return;
                } else {
                    mapData = mapData[0];
                }
                let userAvailableMaps = userInfo.areas.split(';');
                if (userAvailableMaps.includes(mapData.tag.replaceAll('_', ' '))) {
                    if (mapData.tag.replaceAll('_', ' ') === userInfo.area_tag) {
                        return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'MAP_ALREADY_ACTIVE'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                    }
                    let userInfoUpdate = await interaction.client.databaseEditData("update users set area_tag = ? where user_id = ?", [mapData.tag.replaceAll('_', ' '), interaction.user.id]);
                    await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'MAP_CHANGE').format(`<@!${interaction.user.id}>`, mapData.name), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))] });
                } else {
                    await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'MAP_NO_ACCESS'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}


function buttonHandler(userInfo, interaction, serverSettings, mapList, msg) {
    let index = 0;
    var maxPages = mapList.length - 1;

    const collector = msg.createMessageComponentCollector({ time: 40000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.user.id !== interaction.user.id) return;

        collector.resetTimer({ time: 40000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.whitePagesImageBottomEmbed(mapList[index], interaction.client.getWordLanguage(serverSettings.lang, 'MAP_LIST'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1), "https://obelisk.club/npc/map.png");
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