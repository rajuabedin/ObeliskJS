const { ShardingManager } = require('discord.js');
require('dotenv').config()

const express = require('express');
const app = express();

const API_SECRET = 'secret';


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






