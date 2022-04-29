const Discord = require('discord.js');
const MessageEmbed = require('discord.js');
const Command = require('./Command.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const Event = require('./Event.js');
const mysql = require('mysql');
const fs = require("fs");
require('dotenv').config();

class Client extends Discord.Client {
    constructor() {
        super({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS] });

        /**
         *
         * @type {Discord.Collection<String, Command>}
         */
        this.commands = new Discord.Collection();
        this.prefix = process.env.PREFIX
        this.clientId = '836893428196311072';
        this.guildId = "898556800838828104";
        this.languages = {};
        this.wait = require('util').promisify(setTimeout);
        this.random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

        this.messagesToDM = []

        this.developersID = ['145849120698007553', '400614330921648132'];

        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectionLimit: 20
        });

        this.defaultEmojis = { "credit": "<:coin2:784486506051010561>", "units": "<:Obelisk:784486454398943232>" }


    }

    async start(token) {
        const commands = [];
        // LOAD COMMANDS
        fs.readdirSync("./Commands").filter(file => file.endsWith(".js")).forEach(file => {
            /**
             *@type {Command}
             */
            const command = require(`../Commands/${file}`);
            this.commands.set(command.data.name, command)
            commands.push(command.data.toJSON());
        });

        // LOAD EVENTS
        fs.readdirSync("./Events").filter(file => file.endsWith(".js")).forEach(file => {
            /**
             *@type {Event}
             */
            const event = require(`../Events/${file}`);
            this.on(event.event, event.run.bind(null, this));
        });

        // LOAD LANGUAGES
        fs.readdirSync("./Languages").filter(file => file.endsWith(".json")).forEach(file => {
            /**
             *@type {JSON}
             */
            const language = require(`../Languages/${file}`);
            const name = file.replace(".json", "");
            this.addLanguage(name, language);
        });

        const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(
                    Routes.applicationGuildCommands(this.clientId, this.guildId),
                    { body: commands },
                );

                console.log('Successfully reloaded application (/) commands.');
            } catch (error) {
                console.error(error);
            }
        })();

        this.login(token)
    }

    getApp(guildId) {
        const app = this.api.applications(this.user.id)
        if (guildId) {
            app.guilds(guildId)
        }
        return app;
    }

    addLanguage(key, value) {
        this.languages[key] = value;
    }

    getWordLanguage(language, word) {
        return this.languages[language][word];
    }

    whitePagesImageBottomEmbed(text, tittle = "", user, footer, imageUrl) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xfafafa')
            .setAuthor(tittle, user.avatarURL())
            .setDescription(text)
            .setImage(imageUrl)
            .setFooter(footer)
        return textToEmbed
    }

    /**
     * 
     * @param {String} text 
     * @param {String} tittle 
     * @param {Discord.User} user 
     * @param {String} footer 
     * @returns 
     */
    bluePagesEmbed(text, tittle = "", user, footer) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x009dff')
            .setAuthor(tittle, user.avatarURL())
            .setDescription(text)
            .setFooter(footer)
        return textToEmbed
    }

    bluePagesImageEmbed(text, tittle = "", user, footer, imageUrl) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x009dff')
            .setAuthor(tittle, user.avatarURL())
            .setDescription(text)
            .setThumbnail(imageUrl)
            .setFooter(footer)
        return textToEmbed
    }

    blueEmbed(text, tittle = "") {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x009dff')
            .setTitle(tittle)
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    blueEmbedImage(text, tittle = "", user) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x009dff')
            .setAuthor(tittle, user.avatarURL())
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    greenEmbed(text, tittle = "") {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x14e188')
            .setTitle(tittle)
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    greenEmbedImage(text, tittle = "", user) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0x14e188')
            .setAuthor(tittle, user.avatarURL())
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    redEmbed(text, tittle = "") {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xed4245')
            .setTitle(tittle)
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    redEmbedImage(text, tittle = "", user) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xed4245')
            .setAuthor(tittle, user.avatarURL())
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    yellowEmbed(text, tittle = "") {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xffff00')
            .setTitle(tittle)
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    yellowEmbedImage(text, tittle = "", user) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xffff00')
            .setAuthor(tittle, user.avatarURL())
            .setURL('https://obelisk.club/')
            .setDescription(text)
        return textToEmbed
    }

    yellowPagesImageEmbed(text, tittle = "", user, footer, imageUrl) {
        const textToEmbed = new Discord.MessageEmbed()
            .setColor('0xffff00')
            .setAuthor(tittle, user.avatarURL())
            .setDescription(text)
            .setThumbnail(imageUrl)
            .setFooter(footer)
        return textToEmbed
    }


    /**
     * 
     * @param {String} user_id 
     * @returns 
     */

    async getUserAccount(user_id) {
        var result = await this.databaseSelectData("SELECT * from users WHERE user_id = ?", [user_id]);
        return result[0];
    }


    async usePooledConnectionAsync(actionAsync) {
        const connection = await new Promise((resolve, reject) => {
            this.pool.getConnection((ex, connection) => {
                if (ex) {
                    reject(ex);
                } else {
                    resolve(connection);
                }
            });
        });
        try {
            return await actionAsync(connection);
        } finally {
            connection.release();
        }
    }

    /**
     * 
     * @param {String} dtStr 
     * @returns {Date}
     */
    strToDate(dtStr) {
        if (!dtStr) return null
        let dateParts = dtStr.split("/");
        let timeParts = dateParts[2].split(" ")[1].split(":");
        dateParts[2] = dateParts[2].split(" ")[0];
        // month is 0-based, that's why we need dataParts[1] - 1
        return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    }

    /**
     * 
     * @param {String} query 
     * @param {Array} args 
     * @returns 
     */

    async databaseSelectData(query, args) {
        var result = await this.usePooledConnectionAsync(async connection => {
            const rows = await new Promise((resolve, reject) => {
                connection.query(query, args, function (error, results, fields) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            return rows;
        });
        return result;
    }

    /**
     * 
     * @param {String} query 
     * @param {Array} args 
     * @returns 
     */
    async databaseEditData(query, args) {
        var result = await this.usePooledConnectionAsync(async connection => {
            const rowsCount = await new Promise((resolve, reject) => {
                connection.query(query, args, function (error, results, fields) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.affectedRows);
                    }
                });
            });
            return rowsCount;
        });
        console.log(query + " " + args + " " + result);
        var queryCompleted = false;
        if (result > 0) {
            queryCompleted = true;
        }

        return queryCompleted;
    }

    /**
     * 
     * @param {String} query 
     * @param {Array} args 
     * @returns 
     */
    async databaseEditDataReturnID(query, args) {
        var result = await this.usePooledConnectionAsync(async connection => {
            const rowsCount = await new Promise((resolve, reject) => {
                connection.query(query, args, function (error, results, fields) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.insertId);
                    }
                });
            });
            return rowsCount;
        });
        return result;
    }

    async makeid(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }

}

module.exports = Client;