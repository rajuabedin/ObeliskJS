const mysql = require('mysql');
require('dotenv').config();
class VoteConnection {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectionLimit: 5
        });
    }

    async databaseSelectData(query, args) {
        var result = await this.usePooledConnectionAsync(async connection => {
            const rows = await new Promise((resolve, reject) => {
                connection.query(query, args, function (error, results, fields) {
                    if (error) {
                        connection.query('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['error', error.message, error.stack, "Mysql Query", "Not Defied"]);
                        resolve([]);
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
                        connection.query('insert into bot_log (exceptionType, exceptionMessage, fullException, commandName, userID) values (?,?,?,?,?)', ['error', error.message, error.stack, "Mysql Query", "Not Defied"]);
                        resolve([]);
                    } else {
                        resolve(results.affectedRows);
                    }
                });
            });
            return rowsCount;
        });
        var queryCompleted = false;
        if (result > 0) {
            queryCompleted = true;
        }

        return queryCompleted;
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
}

module.exports = VoteConnection;