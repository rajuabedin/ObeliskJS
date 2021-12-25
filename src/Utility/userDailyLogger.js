
module.exports = async (interaction, logType, logMessage) => {
    let today = new Date();

    let entryFoundForToday = false;

    let userTodayLog = await interaction.client.databaseSelectData("SELECT * FROM `user_daily_logs` WHERE DATE(log_date) = CURRENT_DATE()")


    if (userTodayLog[0] === undefined) {
        await interaction.client.databaseEditData(`INSERT INTO user_daily_logs (user_id, log, log_date) VALUES ( ?, '[{"type":"${logType}","message":"${logMessage}","time":"${today.toLocaleTimeString('en-GB')}"}]', CURRENT_TIMESTAMP)`, [interaction.user.id])
    } else {
        await interaction.client.databaseEditData(`UPDATE user_daily_logs SET log= JSON_ARRAY_APPEND(log,'$',CAST('{"type":"${logType}","message":"${logMessage}","time":"${today.toLocaleTimeString('en-GB')}"}' AS JSON)) where user_id = ?`, [interaction.user.id])
    }

}