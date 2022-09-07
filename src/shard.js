const { ShardingManager } = require('discord.js');
const voteConnection = require('./Structures/VoteConnection.js');
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const Topgg = require("@top-gg/sdk");
const fetch = require("node-fetch");
require('dotenv').config()

const express = require('express');
const app = express();

const webhook = new Topgg.Webhook("sajuMoshaObelisk786786")
const API_SECRET = 'secret';

const cConn = new voteConnection();
app.post("/dblwebhook", webhook.listener(async vote => {
    function strToDate(dtStr) {
        if (!dtStr) return null
        let dateParts = dtStr.split("/");
        let timeParts = dateParts[2].split(" ")[1].split(":");
        dateParts[2] = dateParts[2].split(" ")[0];
        // month is 0-based, that's why we need dataParts[1] - 1
        return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    }
    // vote will be your vote object, e.g
    let date = new Date();
    if (vote.guild) {
        let value = 30;
        let item_name = "Aurora_Fragment";
        await cConn.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [vote.user, item_name, value, value]);
        let embed = new MessageEmbed()
            .setColor('0x14e188')
            .setTitle(`Server Vote`)
            .setDescription(`<@${vote.user}>\nThank you very much for your kind vote, we really appreciate it!\nAs a thank you we have added [${value}x ${item_name.replaceAll("_", " ")}](https://obelisk.club/) in your inventory<:ObHug:767231698457853973>`)
            .setTimestamp(date);
        requestBody = {
            channel_id: "780138680811520090",
            message: [{
                tts: false,
                embeds: [embed]
            }]
        }

        var dmMessage = await fetch(`https://api.obelisk.club/DMAPI/send_dm`, {
            method: 'POST',
            headers: {
                'x-api-key': process.env.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
            .then(response => response.json())
            .then(data => { return data });
    } else {
        let value = 1;
        let item_name = "Loot_Box_Tier_II";
        if (vote.isWeekend) {
            value = 2;
        }
        await cConn.databaseEditData(`insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?`, [vote.user, item_name, value, value]);
        let embed = new MessageEmbed()
            .setColor('0x14e188')
            .setTitle(`Bot Vote`)
            .setDescription(`<@${vote.user}>\nThank you very much for your kind vote, we really appreciate it!\nAs a thank you we have added [${value}x ${item_name.replaceAll("_", " ")}](https://obelisk.club/) in your inventory<:ObHug:767231698457853973>`)
            .setTimestamp(date);
        requestBody = {
            channel_id: "778335570064703509",
            message: [{
                tts: false,
                embeds: [embed]
            }]
        }

        var dmMessage = await fetch(`https://api.obelisk.club/DMAPI/send_dm`, {
            method: 'POST',
            headers: {
                'x-api-key': process.env.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
            .then(response => response.json())
            .then(data => { return data });


        let userTask = await cConn.databaseSelectData("select * from task where user_id = ?", [vote.user]);
        userTask = userTask[0];
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        var dateStr =
            ("00" + tomorrow.getDate()).slice(-2) + "/" +
            ("00" + (tomorrow.getMonth() + 1)).slice(-2) + "/" +
            tomorrow.getFullYear() + " " +
            ("00" + tomorrow.getHours()).slice(-2) + ":" +
            ("00" + tomorrow.getMinutes()).slice(-2) + ":" +
            ("00" + tomorrow.getSeconds()).slice(-2);

        let elapsedTimeFromTaskStarted = 0;


        if (userTask === undefined || userTask.time !== "None") {
            elapsedTimeFromTaskStarted = Math.floor((strToDate(userTask.time).getTime() - date.getTime()));
            // check remaining time 
            if (elapsedTimeFromTaskStarted < 1) {
                // reset task
                await cConn.databaseEditData("update task set daily = 0, vote_bot= 1, hunt = 0, gathering=0, status = 'open', time = ? where user_id = ?", [dateStr, vote.user]);
            } else {
                // add vote
                await cConn.databaseEditData("update task set vote_bot= vote_bot + 1 where user_id = ?", [vote.user]);
            }
        }
    }

}))

app.listen(5454)

const shard = new ShardingManager('./bot.js', {
    token: process.env.TOKEN,
    respawn: true
});


// app.use(express.json({ verify: (req, res, buffer) => { req.rawBody = buffer; } }));
// app.listen(9000, () => console.log('Websocket started'));

shard.spawn(); // Spawns recommended shards!

shard.on('shardCreate', newShard => {
    console.log("Shard created")
    newShard.on('ready', () => {
        console.log('Shard ready')
    })
    // Object.keys(require.cache).forEach(function (key) { delete require.cache[key] })
    // require('./WebHook/CommandsWebHook.js')(app, API_SECRET, shard);
    // require('./WebHook/GetBotLogs.js')(app, API_SECRET, shard);
    // console.log("%c Websocket reloaded", 'background: #222; color: #bada55')
})

shard.on('launch', shard => console.log(`[SHARD] Shard ${shard.id}/${shard.totalShards}`));






