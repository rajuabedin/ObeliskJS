const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require("node-fetch");
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Command to check your profile.')
        .addUserOption(options => options
            .setName("player")
            .setDescription("select the player to view their profile")),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        try {
            var user = interaction.options.getUser('player');
            if (user === null) {
                user = interaction.user
            } else {
                var selectedPlayerData = await interaction.client.databaseSelectData("select * from users where user_id = ?", [user.id]);
                if (selectedPlayerData[0] === undefined) {
                    return await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NO_ACC_FOUND'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
                }
            }

            if (user.id === interaction.user.id) {
                if (userInfo.username != interaction.user.username) {
                    await interaction.client.databaseEditData("update users set username = ? where user_id = ?", [user.username, user.id]);
                }
            } else {
                if (secondUserData.username != user.username) {
                    await interaction.client.databaseEditData("update users set username = ? where user_id = ?", [user.username, user.id]);
                }
            }


            const requestBody = {
                user_id: user.id
            }

            await interaction.client.databaseEditData("update users set discord_image = ? where user_id = ?", [user.avatarURL(), user.id])

            var data = await fetch(`https://api.obelisk.club/ObeliskAPI/profile`, {
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
                await interaction.reply(`https://obelisk.club/user_files/${user.id}/${data.filename}`)
            } else {
                await interaction.reply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
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