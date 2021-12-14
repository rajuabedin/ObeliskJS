const Event = require('../Structures/Event.js');
const Command = require('../Structures/Command.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require("fs");
require('dotenv').config()


module.exports = new Event("ready", async (client) => {
    console.log("\x1b[36m",`Logged in as ${client.user.tag} ID -> [${client.user.id}]`);
    console.log("\x1b[37m");
});