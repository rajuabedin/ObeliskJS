const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create an player account')
        .addStringOption(option => option
            .setName('class')
            .setDescription('Choose your class')
            .addChoice('Assassin', 'Assassin')
            .addChoice('Warrior', 'Warrior')
            .addChoice('Mage', 'Mage')
            .addChoice('Tank', 'Tank')
            .setRequired(true))
        .addStringOption(option => option
            .setName('race')
            .setDescription("Choose your player race")
            .addChoice('Human', 'Human')
            .addChoice('Giant', 'Giant')
            .addChoice('Elf', 'Elf')
            .addChoice('Orc', 'Orc')
            .setRequired(true))
        .addStringOption(option => option
            .setName('gender')
            .setDescription("Choose your player gender")
            .addChoice('Female', 'Female')
            .addChoice('Male', 'Male')
            .setRequired(true)),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            if (userInfo !== undefined) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ACCOUNT_EXIST'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            // get confirmation they read skills
            await interaction.reply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CREATE_CREATING').format(interaction.options.getString("class")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })
            collectorFilter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
            collector = interaction.channel.createMessageComponentCollector({ collectorFilter, time: 15000 });
            collector.on('collect', async i => {
                if (i.customId === "yes") {
                    await interaction.client.databaseEditData("INSERT INTO users (user_id, username, class, gender, race, level, exp, gold) VALUES (?,?,?,?,?,?,?,?)",
                        [interaction.user.id, interaction.user.username, interaction.options.getString("class"), interaction.options.getString("gender"), interaction.options.getString("race"), 0, 0, 100]);
                    await interaction.client.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [interaction.user.id, "HP_Potion_lvl_1", 50, 50]);
                    await interaction.client.databaseEditData("insert into bank (user_id) values (?)", [interaction.user.id]);
                    await interaction.client.databaseEditData("insert into buff (user_id) values (?)", [interaction.user.id]);
                    await i.update({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CREATE_CREATED'), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] });
                } else {
                    return await i.update({
                        embeds: [interaction.client.bluePagesImageEmbed(interaction.client.getWordLanguage(serverSettings.lang, `CLASS_${interaction.options.getString("class").toUpperCase()}`), `${interaction.options.getString("class").toUpperCase()} SKILLS`, interaction.user, "", `https://obelisk.club/npc/${interaction.options.getString("class")}.png`)], components: []
                    })
                }
                collector.stop();
            });

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


const rowYesNo = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('yes')
            .setLabel('YES')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('NO')
            .setStyle('DANGER'),
    );