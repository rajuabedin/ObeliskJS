const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const userDailyLogger = require('../Utility/userDailyLogger');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Hunt a monster!'),

    async execute(interaction, userInfo) {
        // try {
        // check cd 
        var userCD = await interaction.client.databaseSelectData("select * from user_cd where user_id = ?", [interaction.user.id]);
        var userOnCD = true;
        var userCDTimeLeft = 0;
        var commandCDTimeSec = 60;


        if (userCD[0] === undefined) {
            await interaction.client.databaseEditData("insert into user_cd (user_id) values(?)", [interaction.user.id])
            userOnCD = false;
        } else {
            let elapsedTimeFromHunt = Math.floor((interaction.client.strToDate(userCD[0].hunt) - Date.now()) / 1000);
            // check if user is a donator


            if (elapsedTimeFromHunt > commandCDTimeSec) {
                return await interaction.reply({ embeds: [interaction.client.redEmbed("Please try again in `" + (elapsedTimeFromHunt - commandCDTimeSec) + "`s", "You are in cooldown!!")], ephemeral: true });;
            }
        }

        if (userOnCD) {
            return await interaction.reply({ embeds: [interaction.client.redEmbed("Please try again later", "You are in cooldown!!")], ephemeral: true });
        }

        await userDailyLogger(interaction, "hunt", "Hunt Started")

        //await interaction.reply({ embeds: [interaction.client.blueEmbed("Request recieved.")] })


        // user stats

        // familiar stats

        // generate monster

        // start Hunt

        // end hunt

        // update cd


        // update cd time on db 
        await interaction.client.databaseEditData("update user_cd set hunt = DATE_ADD(now(),interval ? second) where user_cd = ?", [cdToAdd, interaction.user.id])



        // } catch (error) {
        //     await interaction.reply({ embeds: [interaction.client.redEmbed("Please try again later.", "Error!!")], ephemeral: true });
        //     errorLog.error(error.message, { 'command_name': interaction.commandName });
        // }
    }
}