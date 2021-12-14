const Discord = require('discord.js');
const Client = require('./Client.js');

/**
 *
 * @param {Discord.Message | Discord.Interaction} message
 * @param {string[]} args
 * @param {Client} client
 * @constructor
 */
function RunFunction(message, args, client) {
}

class Command {
    /**
     * @typedef {{name: run, desctiption: string, run: RunFunction}} CommandOptions
     * @param {CommandOptions} options
     */
    constructor(options) {
        this.name = options.name;
        this.description = options.description;
        this.run = options.run;
    }
}

module.exports = Command;