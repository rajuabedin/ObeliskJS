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
const logger = winston.createLogger(logConfiguration);

module.exports = {
    'logger': logger
};