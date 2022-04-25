const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alchemy')
        .setDescription('Opens alchemy book!')
        .addStringOption(option => option
            .setName('order')
            .setDescription("Order alchemy recipes by...")
            .addChoice("name", "material_name")
            .addChoice("id", "id"))
        .addStringOption(option => option
            .setName("search")
            .setDescription("Search item by name or required material name")),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            let searchName = interaction.options.getString('search');
            let orderBy = interaction.options.getString('order');
            let alchemyData = "";

            if (searchName === null && orderBy === null) {
                alchemyData = await interaction.client.databaseSelectData("SELECT convert_materials.material_name, convert_materials.id, convert_materials.required_material, convert_materials.clan_discount, items.desc, items.type, items.value from convert_materials inner join items on convert_materials.material_name = items.name order by id ASC")
            } else if (searchName !== null && orderBy === null) {
                searchName = searchName.replaceAll(' ', '_');
                alchemyData = await interaction.client.databaseSelectData("SELECT convert_materials.material_name, convert_materials.id, convert_materials.required_material, convert_materials.clan_discount, items.desc, items.type, items.value from convert_materials inner join items on convert_materials.material_name = items.name where (convert_materials.material_name like ?) or (items.desc like ?) order by id ASC", ["%" + searchName + "%", "%" + searchName + "%"])
            } else if (searchName === null && orderBy !== null) {
                alchemyData = await interaction.client.databaseSelectData(`SELECT convert_materials.material_name, convert_materials.id, convert_materials.required_material, convert_materials.clan_discount, items.desc, items.type, items.value from convert_materials inner join items on convert_materials.material_name = items.name order by convert_materials.${orderBy} ASC`, [interaction.user.id])
            } else {
                searchName = searchName.replaceAll(' ', '_');
                alchemyData = await interaction.client.databaseSelectData(`SELECT convert_materials.material_name, convert_materials.id, convert_materials.required_material, convert_materials.clan_discount, items.desc, items.type, items.value from convert_materials inner join items on convert_materials.material_name = items.name where (convert_materials.material_name like ?) or (items.desc like ?) order by convert_materials.${orderBy} ASC`, ["%" + searchName + "%", "%" + searchName + "%"])
            }

            if (alchemyData[0] === undefined && searchName === null) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ALCHEMY_MISSING'))] });
            } else if (alchemyData[0] === undefined && searchName !== null) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ALCHEMY_MISSING_SEARCH').format(interaction.options.getString('search')))] });
            } else {
                var itemsPerPage = 2;
                var newAlchemyData = [];
                var stringData = ""

                for (var i = 0; i < alchemyData.length; i++) {
                    if (stringData === "") {
                        stringData += `**${interaction.client.getWordLanguage(serverSettings.lang, 'RECIPES')}**\n`
                    }
                    stringData += `⦿ \`ID ${alchemyData[i].id}\` **${alchemyData[i].material_name.replaceAll('_', ' ')}**\n${alchemyData[i].desc}\n\`\`\`prolog\n${interaction.client.getWordLanguage(serverSettings.lang, 'ALCHEMY_REQUIRED')}\n${alchemyData[i].required_material.replaceAll('_', ' ').replaceAll(';', '\n').replaceAll('-', ' - ')}\`\`\``

                    if (((i + 1) % itemsPerPage) == 0 || i === alchemyData.length - 1) {
                        newAlchemyData.push(stringData);
                        stringData = ""
                    }
                }

                alchemyData = newAlchemyData;

                var maxPages = alchemyData.length;

                var embed = interaction.client.bluePagesImageEmbed(alchemyData[0], interaction.client.getWordLanguage(serverSettings.lang, 'ALCHEMY_RECIPES'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(1, maxPages), "https://obelisk.club/npc/alchemy.gif");
                if (maxPages > 1) {
                    await interaction.reply({ embeds: [embed], components: [row] });
                    buttonHandler(userInfo, interaction, serverSettings, alchemyData);
                } else {
                    await interaction.reply({ embeds: [embed] });
                }
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


function buttonHandler(userInfo, interaction, serverSettings, alchemyData) {
    let index = 0;
    var maxPages = alchemyData.length - 1;

    const filter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
        collector.resetTimer({ time: 15000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesImageEmbed(alchemyData[index], interaction.client.getWordLanguage(serverSettings.lang, 'ALCHEMY_RECIPES'), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1), "https://obelisk.club/npc/alchemy.gif");
        await i.update({ embeds: [embed], components: [row] });
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