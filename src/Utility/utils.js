const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');

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

function titleCase(str) {
    return str.toLowerCase().replace(/(^|\s)\S/g, L => L.toUpperCase());
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

/**
 * 
 * @param {*} client 
 * @param {*} table_name 
 * @param {*} code_length 
 * @returns 
 */
async function generateUniqueCode(client, table_name, value_name = 'code', code_length = 5) {
    try {
        // check code in db
        let code = generateRandomString(code_length)
        let checkCode = await client.databaseSelectData(`SELECT * FROM ${table_name} WHERE ${value_name} = ?`, [code]);
        while (checkCode[0] != undefined) {
            code = generateRandomString(code_length);
            checkCode = await client.databaseSelectData(`SELECT * FROM ${table_name} WHERE ${value_name} = ?`, [code]);
        }
        return code;
    } catch (error) {
        throw error;
    }
}

// update users stats 
async function updateUserStatsFamiliar(interaction, userInfo, familiarInfo) {
    let vit = userInfo.def;
    let intel = userInfo.intel;

    var petStatData = familiarInfo.stat.split("-");
    if (petStatData[0] === "def") {
        vit += parseInt(petStatData[1])
    } else if (petStatData[0] === "intel") {
        intel += parseInt(petStatData[1])
    }

    // get equipment info

    let weaponInfo = await interaction.client.databaseSelectData("select * from created_eqp where user_id = ? and item_id = ?", [userInfo.user_id, userInfo.eqp_weapon]);
    let armorInfo = await interaction.client.databaseSelectData("select * from created_eqp where user_id = ? and item_id = ?", [userInfo.user_id, userInfo.eqp_armor]);

    if (weaponInfo.length > 0) {
        weaponInfo = weaponInfo[0];
    } else {
        weaponInfo = "None";
    }

    if (armorInfo.length > 0) {
        armorInfo = armorInfo[0];
    } else {
        armorInfo = "None";
    }

    let hp = 0;
    let mp = 0;
    let atk = 0;
    let def = 0;

    let current_hp = userInfo.current_hp;
    let current_mp = userInfo.current_mp;

    if (userInfo.level < 30) {
        hp = Math.ceil(30 * vit + 85 + 15 * userInfo.level);
    } else {
        hp = Math.ceil(userInfo.level * vit + 85 + 15 * userInfo.level);
    }

    mp = Math.ceil(intel * 15 + 85);

    if (weaponInfo !== "None") {
        hp += weaponInfo.hp;
        mp += weaponInfo.mp;
        atk += weaponInfo.attack;
        def += weaponInfo.armor;
    }

    if (armorInfo !== "None") {
        hp += armorInfo.hp;
        mp += armorInfo.mp;
        atk += armorInfo.attack;
        def += armorInfo.armor;
    }

    if (current_hp > hp) {
        current_hp = hp;
    }
    if (current_mp > mp) {
        current_mp = mp;
    }

    await interaction.client.databaseEditData("update users set hp = ?, mp = ?, attack = ?, armor = ?, current_hp = ? , current_mp = ?, pet_id = ? where user_id = ?",
        [hp, mp, atk, def, current_hp, current_mp, familiarInfo.pet_id, userInfo.user_id]);
}

// generate n number of characters
function generateRandomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function paginationHandler(type, userInfo, interaction, serverSettings, dataToPaginate, msg) {
    let index = 0;
    var maxPages = dataToPaginate.length - 1;


    const collector = msg.createMessageComponentCollector({ time: 40000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.user.id != interaction.user.id) {
            return;
        }
        collector.resetTimer({ time: 40000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        var embed = interaction.client.bluePagesEmbed(dataToPaginate[index], interaction.client.getWordLanguage(serverSettings.lang, type), interaction.user, interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1));
        await interaction.editReply({ embeds: [embed], components: [rowButtonLeftRight] });
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

}

/**
 * 
 * @param {String} type 
 * @param {*} userInfo 
 * @param {*} interaction 
 * @param {*} serverSettings 
 * @param {*} dataToPaginate 
 * @param {*} msg 
 * @param {*} imageURL 
 */
function paginationHandlerBottomImage(type, userInfo, interaction, serverSettings, dataToPaginate, msg, imageURL) {
    let index = 0;
    var maxPages = dataToPaginate.length - 1;


    const collector = msg.createMessageComponentCollector({ time: 40000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.user.id != interaction.user.id) {
            return;
        }
        collector.resetTimer({ time: 40000 });
        if (i.customId === 'left')
            index--;
        else if (i.customId === 'right')
            index++;
        if (index > maxPages)
            index = 0;
        if (index < 0)
            index = maxPages;
        let embed = new MessageEmbed()
            .setColor(interaction.client.colors.blue)
            .setAuthor({
                name: type,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setDescription(dataToPaginate[index])
            .setFooter({
                text: interaction.client.getWordLanguage(serverSettings.lang, 'PAGES').format(index + 1, maxPages + 1),
            })
            .setImage(imageURL)
        await interaction.editReply({ embeds: [embed], components: [rowButtonLeftRight] });
    });

    collector.on('end', collected => {
        interaction.editReply({ components: [] })
    });

}

function msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
        days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 24);

    days = (days < 10) ? "0" + days : days;
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    if (days > 0) {
        return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
    } else if (hours > 0) {
        return hours + "h " + minutes + "m " + seconds + "s";
    } else if (minutes > 0) {
        return minutes + "m " + seconds + "s";
    } else if (seconds > 0) {
        return seconds + "s " + milliseconds + "ms";
    } else if (milliseconds > 0) {
        return milliseconds + "ms";
    } else {
        return "Ready";
    }
}

/**
     * 
     * @param {String} dtStr 
     * @returns {Date}
     */
function strToDate(dtStr) {
    if (!dtStr) return null
    let dateParts = dtStr.split("/");
    let timeParts = dateParts[2].split(" ")[1].split(":");
    dateParts[2] = dateParts[2].split(" ")[0];
    // month is 0-based, that's why we need dataParts[1] - 1
    return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
}

function dateToStr(dt) {
    if (!dt) return null
    return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`;
}

const rowButtonLeftRight = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('left')
            //.setLabel('Left')
            .setEmoji('887811358509379594')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('right')
            //.setLabel('Right')
            .setEmoji('887811358438064158')
            .setStyle('PRIMARY')
    );

module.exports = {
    getRandomNumberBetween,
    weightedRandom,
    nFormatterStringToNumber,
    nFormatterNumberToString,
    isNumeric,
    userLog,
    getCurrentTimeDMY,
    getCurrentTimeHMSDMY,
    titleCase,
    generateUniqueCode,
    generateRandomString,
    updateUserStatsFamiliar,
    paginationHandler,
    msToTime,
    paginationHandlerBottomImage,
    strToDate,
    dateToStr
}