/**
 * Configurations of logger.
 */
const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

var transport = new winston.transports.DailyRotateFile({
    filename: './logs/log-%DATE%.log',
    datePattern: 'DD-MM-YYYY',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

transport.on('rotate', function (oldFilename, newFilename) {
    new winston.transports.File({
        level: 'warn',
        json: true,
        timestamp: true,
        datePattern: 'dd-MM-yyyy',
    }),
        new winston.transports.File({
            level: 'error',
            json: true,
            timestamp: true,
            datePattern: 'dd-MM-yyyy',
        })
});


const logConfiguration = {
    transports: [
        transport
    ],
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'DD-MM-YYYY HH:mm:ss'
        }),
        winston.format.json()
    ),
};
const loggerBase = winston.createLogger(logConfiguration);
class NewLogger {

    async log(exception, interaction) {
        try {
            return await interaction.client.databaseEditDataReturnID('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['log', exception.message, exception.stack, interaction.commandName, interaction.user.id]);
        } catch (error) {
            loggerBase.error(error.message, error.stack);
        }
    }

    async error(exception, interaction) {
        try {
            return await interaction.client.databaseEditDataReturnID('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['error', exception.message, exception.stack, interaction.commandName, interaction.user.id]);
        } catch (error) {
            loggerBase.error(error.message, error.stack);
        }

    }

    async warn(exception, interaction) {
        try {
            return await interaction.client.databaseEditDataReturnID('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['warn', exception.message, exception.stack, interaction.commandName, interaction.user.id]);
        } catch (error) {
            loggerBase.error(error.message, error.stack);
        }
    }

    async custom(message, interaction) {
        try {
            return await interaction.client.databaseEditDataReturnID('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['custom', message.error, message.error, interaction.commandName, interaction.user.id]);
        } catch (error) {
            loggerBase.error(message, interaction.user.id);
        }
    }

    async custom1(message) {
        loggerBase.error(message.error);
    }

}

module.exports = {
    'logger': new NewLogger()
};