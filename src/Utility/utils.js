function getRandomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
/**
* Picks the random item based on its weight.
* The items with higher weight will be picked more often (with a higher probability).
*
* For example:
* - items = ['banana', 'orange', 'apple']
* - weights = [0, 0.2, 0.8]
* - weightedRandom(items, weights) in 80% of cases will return 'apple', in 20% of cases will return
* 'orange' and it will never return 'banana' (because probability of picking the banana is 0%)
*
* @param {any[]} items
* @param {number[]} weights
* @returns {{item: any, index: number}}
*/
function weightedRandom(items, weights) {
    if (items.length !== weights.length) {
        throw new Error('Items and weights must be of the same size');
    }

    if (!items.length) {
        throw new Error('Items must not be empty');
    }

    // Preparing the cumulative weights array.
    // For example:
    // - weights = [1, 4, 3]
    // - cumulativeWeights = [1, 5, 8]
    const cumulativeWeights = [];
    for (let i = 0; i < weights.length; i += 1) {
        cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
    }

    // Getting the random number in a range of [0...sum(weights)]
    // For example:
    // - weights = [1, 4, 3]
    // - maxCumulativeWeight = 8
    // - range for the random number is [0...8]
    const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
    const randomNumber = maxCumulativeWeight * Math.random();

    // Picking the random item based on its weight.
    // The items with higher weight will be picked more often.
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (cumulativeWeights[itemIndex] >= randomNumber) {
            return {
                item: items[itemIndex],
                index: itemIndex,
            };
        }
    }
}

function isNumeric(num) {
    return !isNaN(num)
}

function nFormatterStringToNumber(val) {
    if (isNumeric(val)) {
        return parseInt(val);
    }

    multiplier = val.substr(-1).toLowerCase();
    if (multiplier == "k")
        return parseFloat(val) * 1000;
    else if (multiplier == "m")
        return parseFloat(val) * 1000000;
    else if (multiplier == "b")
        return parseFloat(val) * 100000000;
    else
        return "error"
}
function nFormatterNumberToString(num, digits) {
    var si = [
        { value: 1, symbol: "" },
        { value: 1E3, symbol: "k" },
        { value: 1E6, symbol: "M" },
        { value: 1E9, symbol: "G" },
        { value: 1E12, symbol: "T" },
        { value: 1E15, symbol: "P" },
        { value: 1E18, symbol: "E" }
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
        if (num >= si[i].value) {
            break;
        }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

// current time in day month month year
function getCurrentTimeDMY() {
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear();
    return day + "/" + month + "/" + year;
}

// current time in day month month year
function getCurrentTimeHMSDMY() {
    var d = new Date();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var second = d.getSeconds();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear();
    return hour + ":" + minute + ":" + second + " " + day + "/" + month + "/" + year;
}

async function userLog(interaction, userID, msg) {
    let currentLog = await interaction.client.databaseSelectData('SELECT * FROM user_daily_log WHERE user_id = ? AND DATE(log_date) = CURDATE()', [userID]);
    if (currentLog.length == 0) {
        await interaction.client.databaseEditData('INSERT INTO user_daily_log (user_id, log) VALUES (?, ?)', [userID, `{"time":"${getCurrentTimeHMSDMY()}","log":"${msg}"}`]);
    } else {
        await interaction.client.databaseEditData(`Update user_daily_log set log = JSON_ARRAY_APPEND(log, '$', JSON_OBJECT("time", ?, "log", ?)) where user_id = ? AND DATE(log_date) = CURDATE()`, [getCurrentTimeHMSDMY(), msg, userID]);
    }
}

module.exports = {
    getRandomNumberBetween,
    weightedRandom,
    nFormatterStringToNumber,
    nFormatterNumberToString,
    isNumeric,
    userLog,
    getCurrentTimeDMY,
    getCurrentTimeHMSDMY
}