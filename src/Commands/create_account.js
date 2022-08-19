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
            .addChoices(
                { name: 'Warrior', value: 'warrior' },
                { name: 'Mage', value: 'mage' },
                { name: 'Assassin', value: 'assassin' },
                { name: 'Tank', value: 'tank' },
            )
            .setRequired(true))
        .addStringOption(option => option
            .setName('race')
            .setDescription("Choose your player race")
            .addChoices(
                { name: "Human", value: "human" },
                { name: "Giant", value: "giant" },
                { name: "Elf", value: "elf" },
                { name: "Orc", value: "orc" },
            )
            .setRequired(true))
        .addStringOption(option => option
            .setName('gender')
            .setDescription("Choose your player gender")
            .addChoices(
                { name: "Female", value: "female" },
                { name: "Male", value: "male" }
            )
            .setRequired(true)),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
            if (userInfo !== undefined) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ACCOUNT_EXIST'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            // get confirmation they read skills
            await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CREATE_CREATING').format(interaction.options.getString("class")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

            collector = msg.createMessageComponentCollector({ time: 15000 });
            collector.on('collect', async i => {
                i.defferUpdate();
                if (i.user.id !== interaction.user.id) return;
                if (i.customId === "yes") {
                    await interaction.client.databaseEditData("INSERT INTO users (user_id, username, class, gender, race, level, exp, gold) VALUES (?,?,?,?,?,?,?,?)",
                        [interaction.user.id, interaction.user.username, interaction.options.getString("class"), interaction.options.getString("gender"), interaction.options.getString("race"), 0, 0, 100]);
                    await i.update({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CREATE_CREATED'), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] });
                } else {
                    return await i.update({
                        embeds: [interaction.client.bluePagesImageEmbed(interaction.client.getWordLanguage(serverSettings.lang, `CLASS_${interaction.options.getString("class").toUpperCase()}`), `${interaction.options.getString("class").toUpperCase()} SKILLS`, interaction.user, "", `https://obelisk.club/npc/${interaction.options.getString("class")}.png`)], components: []
                    })
                }
                collector.stop();
            });

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
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('NO')
            .setStyle('DANGER'),
    );