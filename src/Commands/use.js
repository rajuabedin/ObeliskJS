const Command = require('../Structures/Command.js');
const errorLog = require('../Utility/logger').logger;
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const userDailyLogger = require('../Utility/userDailyLogger');
const fetch = require("node-fetch");
const utility = require('../Utility/utils');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item!')
        .addStringOption(option => option
            .setName('id')
            .setRequired(true)
            .setDescription('The id of the item you want to use.'))
        .addStringOption(option => option
            .setName('amount')
            .setDescription('The amount of the item you want to use.'))
        .addStringOption(option => option
            .setName('extra')
            .setDescription('Extra arguments for the item.')),

    async execute(interaction, userInfo, serverSettings) {
        String.prototype.format = function () {
            var i = 0, args = arguments;
            return this.replace(/{}/g, function () {
                return typeof args[i] != 'undefined' ? args[i++] : '';
            });
        };
        let msg = await interaction.deferReply({ fetchReply: true });
        try {
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

            let amount = interaction.options.getString('amount');
            if (amount === null) {
                amount = 1;
            } else {
                amount = nFormatterStringToNumber(amount);
                if (amount == "error" || amount < 1) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_TRADE_AMOUNT'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
            }

            let itemInfo = await interaction.client.databaseSelectData("select user_inventory.item_name, user_inventory.quantity, items.id, items.desc, items.type, items.value from user_inventory inner join items on user_inventory.item_name = items.name where user_inventory.user_id = ? and items.id = ?", [interaction.user.id, interaction.options.getString('id')]);

            if (itemInfo[0] === undefined) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            } else {
                itemInfo = itemInfo[0];
            }

            if (itemInfo.quantity < amount) {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_ITEM_NF_INV_QUANTITY').format(amount, itemInfo.item_name), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            let usedItem = false;
            let extraArgs = interaction.options.getString('extra');

            if (itemInfo.item_name == "HP_Potion_lvl_1") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id !== interaction.user.id) return;
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                let requiredPotions = amount;
                let newHP = 30 * requiredPotions + userInfo.current_hp;

                if (newHP > userInfo.hp) {
                    newHP = userInfo.hp;
                }

                await interaction.client.databaseEditData("update users set current_hp = ? where user_id = ?", [newHP, userInfo.user_id]);
                usedItem = true;
            } else if (itemInfo.item_name == "MP_Potion_lvl_1") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id !== interaction.user.id) return;
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }
                let requiredPotions = amount;
                let newMP = 15 * requiredPotions + userInfo.current_mp;

                if (newMP > userInfo.mp) {
                    newMP = userInfo.mp;
                }

                await interaction.client.databaseEditData("update users set current_mp = ? where user_id = ?", [newMP, userInfo.user_id]);

                usedItem = true;
            } else if (itemInfo.item_name == "Bio_Editor") {
                if (extraArgs === null) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_EXTRA_ARGUMENT_MISSING'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                if (amount > 1) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(1), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                await interaction.client.databaseEditData("update users set description = ? where user_id = ?", [extraArgs, userInfo.user_id]);
                usedItem = true;

            } else if (itemInfo.item_name == "Rank_II_Gem_Pack") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                let gemList = ['Gem_Damage_II', 'Gem_Defence_II', 'Gem_HP_II', 'Gem_MP_II'];
                let foundItems = []
                for (var i = 0; i < amount; i++) {
                    let randomItem = gemList[Math.floor(Math.random() * gemList.length)];
                    foundItems.push([randomItem, 1]);
                }
                for (let i = 0; i < foundItems.length; i++) {
                    await interaction.client.databaseEditData("insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?", [userInfo.user_id, foundItems[i][0], foundItems[i][1], foundItems[i][1]]);
                }
                usedItem = true;
                await userDailyLogger(interaction, interaction.user, "use", `Found [${foundItems.map(i => i[0].replaceAll('_', ' ')).join(", ")}]`);
            } else if (itemInfo.item_name == "Ultra_Theme_Pack") {
                if (amount > 1) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(1), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                let availableSkins = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10',
                    'U11', 'U12', 'U13', 'U14', 'U15']

                let randoSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];

                const requestBody = {
                    user_id: interaction.user.id,
                    selected_bg: randoSkin
                }

                await interaction.client.databaseEditData("update users set discord_image = ? where user_id = ?", [interaction.user.avatarURL(), interaction.user.id])
                await interaction.client.databaseEditData("insert into user_skins (user_id, skin_name, quantity) values (?, ?,1) ON DUPLICATE KEY update quantity = quantity + 1", [interaction.user.id, randoSkin])

                var data = await fetch(`https://api.obelisk.club/ObeliskAPI/profile_c`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => response.json())
                    .then(data => { return data });
                if (data.success == true) {
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(interaction.client.getWordLanguage(serverSettings.lang, "SUCCESSFUL"))
                        .setDescription(interaction.client.getWordLanguage(serverSettings.lang, "SKIN_FOUND").format(randoSkin))
                        .setImage(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                    await interaction.followUp({ embeds: [embed], components: [] })
                    usedItem = true;
                }
            } else if (itemInfo.item_name == "Equipment_Booster") {
                if (extraArgs === null) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_EXTRA_ARGUMENT_MISSING'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
                }
                if (amount > 1) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(1), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                let equipmentInfo = await interaction.client.databaseSelectData("select * from created_eqp where item_id = ? and user_id = ?", [extraArgs.toUpperCase(), interaction.user.id]);
                if (equipmentInfo[0] === undefined) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "EQUIPMENT_NOT_FOUND"), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                } else {
                    equipmentInfo = equipmentInfo[0];
                }

                if (equipmentInfo.boosted == "yes") {
                    continueCode = false;
                    await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'EQ_BOOSTED_P').format(equipmentInfo.boosted_by), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                    collector = msg.createMessageComponentCollector({ time: 40000 });
                    awaitConfirmation = true;
                    collector.on('collect', async i => {
                        await i.deferUpdate();
                        if (i.user.id != interaction.user.id) {
                            return;
                        }
                        if (i.customId === "yes") {
                            continueCode = true;
                        } else {
                            return await interaction.editReply({
                                embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                            })
                        }
                        collector.stop();
                    });

                    collector.on('end', async i => {
                        awaitConfirmation = false;
                    });

                    while (awaitConfirmation) {
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (!continueCode) {
                        return;
                    }
                }

                let randomATk = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
                await interaction.client.databaseEditData("update created_eqp set boosted = ?, boosted_by = ?, attack = attack + ? where item_id = ? and user_id = ?", ["yes", randomATk, randomATk, extraArgs.toUpperCase(), interaction.user.id])
                usedItem = true;
                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'EQ_BOOSTED').format(extraArgs.toUpperCase(), randomATk), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] })

            } else if (itemInfo.item_name == "Loot_Box_Tier_I") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }
                let maxAmmout = 5 * amount;
                let foundCount = 0;
                let mapDrop = []
                let monsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity != 'Boss'", [userInfo.area_tag.replaceAll(" ", "_")]);
                for (let i = 0; i < monsters.length; i++) {
                    let materials = monsters[i].drop_n_q.split(";");
                    for (let j = 0; j < materials.length; j++) {
                        let material = materials[j].split("-");
                        if (!mapDrop.includes(material[0])) {
                            mapDrop.push(material[0]);
                        }
                    }
                }
                let loot = [];
                let lootQuantiy = []
                while (foundCount != maxAmmout) {
                    let item = mapDrop[Math.floor(Math.random() * mapDrop.length)];
                    let quantity = Math.floor(Math.random() * (Math.floor(maxAmmout / 2) - Math.floor(maxAmmout / 4) + 1)) + Math.floor(maxAmmout / 4);
                    if (quantity < 1) {
                        quantity = 1;
                    }
                    if (quantity > maxAmmout - foundCount) {
                        quantity = maxAmmout - foundCount;
                    }
                    if (!loot.includes(item)) {
                        loot.push(item);
                        lootQuantiy.push(quantity);
                        foundCount += quantity;
                    } else {
                        let index = loot.indexOf(item);
                        lootQuantiy[index][1] += quantity;
                    }
                }
                let lootString = "";

                for (let i = 0; i < loot.length; i++) {
                    lootString += lootQuantiy[i] + "x " + loot[i].replaceAll("_", " ") + "\n";
                    await interaction.client.databaseEditData("insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?", [interaction.user.id, loot[i], lootQuantiy[i], lootQuantiy[i]]);
                }
                usedItem = true;
                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'LOOT_BOX_OPEN').format(amount, itemInfo.item_name.replaceAll("_", " "), lootString), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] })
            } else if (itemInfo.item_name == "Loot_Box_Tier_II") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }
                let maxAmmout = 20 * amount;
                let foundCount = 0;
                let mapDrop = []
                let monsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity != 'Boss'", [userInfo.area_tag.replaceAll(" ", "_")]);
                for (let i = 0; i < monsters.length; i++) {
                    let materials = monsters[i].drop_n_q.split(";");
                    for (let j = 0; j < materials.length; j++) {
                        let material = materials[j].split("-");
                        if (!mapDrop.includes(material[0])) {
                            mapDrop.push(material[0]);
                        }
                    }
                }
                let loot = [];
                let lootQuantiy = []
                while (foundCount != maxAmmout) {
                    let item = mapDrop[Math.floor(Math.random() * mapDrop.length)];
                    let quantity = Math.floor(Math.random() * (Math.floor(maxAmmout / 2) - Math.floor(maxAmmout / 4) + 1)) + Math.floor(maxAmmout / 4);
                    if (quantity < 1) {
                        quantity = 1;
                    }
                    if (quantity > maxAmmout - foundCount) {
                        quantity = maxAmmout - foundCount;
                    }
                    if (!loot.includes(item)) {
                        loot.push(item);
                        lootQuantiy.push(quantity);
                        foundCount += quantity;
                    } else {
                        let index = loot.indexOf(item);
                        lootQuantiy[index][1] += quantity;
                    }
                }
                let lootString = "";

                for (let i = 0; i < loot.length; i++) {
                    lootString += lootQuantiy[i] + "x " + loot[i].replaceAll("_", " ") + "\n";
                    await interaction.client.databaseEditData("insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?", [interaction.user.id, loot[i], lootQuantiy[i], lootQuantiy[i]]);
                }
                usedItem = true;
                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'LOOT_BOX_OPEN').format(amount, itemInfo.item_name.replaceAll("_", " "), lootString), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] })
            } else if (itemInfo.item_name == "Loot_Box_Tier_III") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }
                let maxAmmout = 15 * amount;
                let foundCount = 0;
                let mapDrop = []
                let monsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity != 'Boss'", [userInfo.area_tag.replaceAll(" ", "_")]);
                for (let i = 0; i < monsters.length; i++) {
                    let materials = monsters[i].drop_n_q.split(";");
                    for (let j = 0; j < materials.length; j++) {
                        let material = materials[j].split("-");
                        if (!mapDrop.includes(material[0])) {
                            mapDrop.push(material[0]);
                        }
                    }
                }
                mapDrop.push("Aurora_Fragment");
                let loot = [];
                let lootQuantiy = []
                while (foundCount != maxAmmout) {
                    let item = mapDrop[Math.floor(Math.random() * mapDrop.length)];
                    let quantity = Math.floor(Math.random() * (Math.floor(maxAmmout / 2) - Math.floor(maxAmmout / 4) + 1)) + Math.floor(maxAmmout / 4);
                    if (quantity < 1) {
                        quantity = 1;
                    }
                    if (item === "Aurora_Fragment") {
                        quantity = 15;
                    }
                    if (quantity > maxAmmout - foundCount) {
                        quantity = maxAmmout - foundCount;
                    }
                    if (!loot.includes(item)) {
                        loot.push(item);
                        lootQuantiy.push(quantity);
                        foundCount += quantity;
                    } else {
                        let index = loot.indexOf(item);
                        lootQuantiy[index][1] += quantity;
                    }
                }
                let lootString = "";

                for (let i = 0; i < loot.length; i++) {
                    lootString += lootQuantiy[i] + "x " + loot[i].replaceAll("_", " ") + "\n";
                    await interaction.client.databaseEditData("insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?", [interaction.user.id, loot[i], lootQuantiy[i], lootQuantiy[i]]);
                }
                usedItem = true;
                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'LOOT_BOX_OPEN').format(amount, itemInfo.item_name.replaceAll("_", " "), lootString), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] })
            } else if (itemInfo.item_name == "Loot_Box_Tier_IV") {
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }
                let maxAmmout = 25 * amount;
                let foundCount = 0;
                let mapDrop = []
                let monsters = await interaction.client.databaseSelectData("select * from monster_info where area_tag = ? and rarity != 'Boss'", [userInfo.area_tag.replaceAll(" ", "_")]);
                for (let i = 0; i < monsters.length; i++) {
                    let materials = monsters[i].drop_n_q.split(";");
                    for (let j = 0; j < materials.length; j++) {
                        let material = materials[j].split("-");
                        if (!mapDrop.includes(material[0])) {
                            mapDrop.push(material[0]);
                        }
                    }
                }
                mapDrop.push("Aurora_Fragment");
                let loot = [];
                let lootQuantiy = []
                while (foundCount != maxAmmout) {
                    let item = mapDrop[Math.floor(Math.random() * mapDrop.length)];
                    let quantity = Math.floor(Math.random() * (Math.floor(maxAmmout / 2) - Math.floor(maxAmmout / 4) + 1)) + Math.floor(maxAmmout / 4);
                    if (quantity < 1) {
                        quantity = 1;
                    }
                    if (item === "Aurora_Fragment") {
                        quantity = 15;
                    }
                    if (quantity > maxAmmout - foundCount) {
                        quantity = maxAmmout - foundCount;
                    }
                    if (!loot.includes(item)) {
                        loot.push(item);
                        lootQuantiy.push(quantity);
                        foundCount += quantity;
                    } else {
                        let index = loot.indexOf(item);
                        lootQuantiy[index][1] += quantity;
                    }
                }
                let lootString = "";

                for (let i = 0; i < loot.length; i++) {
                    lootString += lootQuantiy[i] + "x " + loot[i].replaceAll("_", " ") + "\n";
                    await interaction.client.databaseEditData("insert into user_inventory (user_id, item_name, quantity) values (?, ?,?) ON DUPLICATE KEY update quantity = quantity + ?", [interaction.user.id, loot[i], lootQuantiy[i], lootQuantiy[i]]);
                }
                usedItem = true;
                await interaction.followUp({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'LOOT_BOX_OPEN').format(amount, itemInfo.item_name.replaceAll("_", " "), lootString), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] })
            } else if (itemInfo.item_name == "Profile_Theme_Pack") {
                if (amount > 1) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(1), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }
                // confirm want to use
                let continueCode = false;
                await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRMATION_USE').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'CONFIRM'))], components: [rowYesNo] })

                collector = msg.createMessageComponentCollector({ time: 40000 });
                let awaitConfirmation = true;
                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != interaction.user.id) {
                        return;
                    }
                    if (i.customId === "yes") {
                        continueCode = true;
                    } else {
                        return await interaction.editReply({
                            embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "C_DECLINED"), interaction.client.getWordLanguage(serverSettings.lang, "INFORMATION"))], components: []
                        })
                    }
                    collector.stop();
                });

                collector.on('end', async i => {
                    awaitConfirmation = false;
                });

                while (awaitConfirmation) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!continueCode) {
                    return;
                }

                let profileThemes = await interaction.client.databaseSelectData("select * from bg_info where rarity_per != 0");
                let percentage = [];
                for (let i = 0; i < profileThemes.length; i++) {
                    percentage.push(profileThemes[i].rarity_per);
                }

                let foundSkin = weightedRandom(profileThemes, percentage).item.file_name;

                const requestBody = {
                    user_id: interaction.user.id,
                    selected_bg: foundSkin
                }

                await interaction.client.databaseEditData("update users set discord_image = ? where user_id = ?", [interaction.user.avatarURL(), interaction.user.id])
                await interaction.client.databaseEditData("insert into user_skins (user_id, skin_name, quantity) values (?, ?,1) ON DUPLICATE KEY update quantity = quantity + 1", [interaction.user.id, foundSkin])

                var data = await fetch(`https://api.obelisk.club/ObeliskAPI/profile_c`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => response.json())
                    .then(data => { return data });
                if (data.success == true) {
                    let embed = new MessageEmbed()
                        .setColor('0x14e188')
                        .setTitle(interaction.client.getWordLanguage(serverSettings.lang, "SUCCESSFUL"))
                        .setDescription(interaction.client.getWordLanguage(serverSettings.lang, "SKIN_FOUND").format(foundSkin))
                        .setImage(`https://obelisk.club/user_files/${interaction.user.id}/${data.filename}`)
                    await interaction.followUp({ embeds: [embed], components: [] })
                    usedItem = true;
                }

                await userDailyLogger(interaction, interaction.user, "use", `Found skin [${foundSkin}]`);

            } else if (itemInfo.item_name == "Essential_Food") {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }

                if (amount > 4) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(4), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }

                let petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                petInfo = petInfo[0];
                // check last feed timing
                let lastFeed = utility.strToDate(userInfo.last_feed_time);

                let now = new Date();

                // check hour difference between now and last feed
                let hourDiff = Math.abs(now - lastFeed) / 36e5;

                if (hourDiff > 1) {
                    petInfo.remaining_feed += hourDiff * 2;
                }

                if (petInfo.remaining_feed > 4) {
                    petInfo.remaining_feed = 4;
                }

                // check amount greater than remaining feed
                if (amount > petInfo.remaining_feed) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NEXT_FEED').format(petInfo.remaining_feed, 2))] });
                }

                let newStamina = petInfo.stamina + amount * 30;

                if (newStamina > petInfo.max_stamina) {
                    newStamina = petInfo.max_stamina;
                }

                petInfo.remaining_feed -= amount;

                await interaction.client.databaseEditData("update users_pet set last_feed_time = ?, stamina = ?, remaining_feed = ? where user_id = ? and pet_id = ?", [utility.dateToStr(now), newStamina, petInfo.remaining_feed, interaction.user.id, userInfo.pet_id]);
                usedItem = true;
            } else if (itemInfo.item_name == "Basic_Food") {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }

                if (amount > 4) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(4), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }

                let petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                petInfo = petInfo[0];
                // check last feed timing
                let lastFeed = utility.strToDate(userInfo.last_feed_time);

                let now = new Date();

                // check hour difference between now and last feed
                let hourDiff = Math.abs(now - lastFeed) / 36e5;

                if (hourDiff > 1) {
                    petInfo.remaining_feed += hourDiff * 2;
                }

                if (petInfo.remaining_feed > 4) {
                    petInfo.remaining_feed = 4;
                }

                // check amount greater than remaining feed
                if (amount > petInfo.remaining_feed) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NEXT_FEED').format(petInfo.remaining_feed, 2))] });
                }

                let newStamina = petInfo.stamina + amount * 60;

                if (newStamina > petInfo.max_stamina) {
                    newStamina = petInfo.max_stamina;
                }

                petInfo.remaining_feed -= amount;

                await interaction.client.databaseEditData("update users_pet set last_feed_time = ?, stamina = ?, remaining_feed = ? where user_id = ? and pet_id = ?", [utility.dateToStr(now), newStamina, petInfo.remaining_feed, interaction.user.id, userInfo.pet_id]);
                usedItem = true;
            } else if (itemInfo.item_name == "Intermediate_Food") {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }

                if (amount > 4) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(4), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }

                let petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                petInfo = petInfo[0];
                // check last feed timing
                let lastFeed = utility.strToDate(userInfo.last_feed_time);

                let now = new Date();

                // check hour difference between now and last feed
                let hourDiff = Math.abs(now - lastFeed) / 36e5;

                if (hourDiff > 1) {
                    petInfo.remaining_feed += hourDiff * 2;
                }

                if (petInfo.remaining_feed > 4) {
                    petInfo.remaining_feed = 4;
                }

                // check amount greater than remaining feed
                if (amount > petInfo.remaining_feed) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NEXT_FEED').format(petInfo.remaining_feed, 2))] });
                }

                let newStamina = petInfo.stamina + amount * 90;

                if (newStamina > petInfo.max_stamina) {
                    newStamina = petInfo.max_stamina;
                }

                petInfo.remaining_feed -= amount;

                await interaction.client.databaseEditData("update users_pet set last_feed_time = ?, stamina = ?, remaining_feed = ? where user_id = ? and pet_id = ?", [utility.dateToStr(now), newStamina, petInfo.remaining_feed, interaction.user.id, userInfo.pet_id]);
                usedItem = true;
            } else if (itemInfo.item_name == "Premium_Food") {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }

                if (amount > 4) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(4), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }

                let petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                petInfo = petInfo[0];
                // check last feed timing
                let lastFeed = utility.strToDate(userInfo.last_feed_time);

                let now = new Date();

                // check hour difference between now and last feed
                let hourDiff = Math.abs(now - lastFeed) / 36e5;

                if (hourDiff > 1) {
                    petInfo.remaining_feed += hourDiff * 2;
                }

                if (petInfo.remaining_feed > 4) {
                    petInfo.remaining_feed = 4;
                }

                // check amount greater than remaining feed
                if (amount > petInfo.remaining_feed) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NEXT_FEED').format(petInfo.remaining_feed, 2))] });
                }

                let newStamina = petInfo.stamina + amount * 100;
                let newHappiness = petInfo.happiness + amount * 30;

                if (newStamina > petInfo.max_stamina) {
                    newStamina = petInfo.max_stamina;
                }

                if (newHappiness > petInfo.max_happiness) {
                    newHappiness = petInfo.max_happiness;
                }

                petInfo.remaining_feed -= amount;

                await interaction.client.databaseEditData("update users_pet set last_feed_time = ?, stamina = ?, happiness = ?, remaining_feed = ? where user_id = ? and pet_id = ?", [utility.dateToStr(now), newStamina, newHappiness, petInfo.remaining_feed, interaction.user.id, userInfo.pet_id]);
                usedItem = true;
            } else if (itemInfo.item_name == "Familiar_Toy") {
                if (['none', '', null, 'null'].includes(userInfo.pet_id)) {
                    return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'FAMILIAR_NOT_EQUIPPED'))] });
                }

                if (amount > 10) {
                    return interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, "USE_N_AT_A_TIME").format(10), interaction.client.getWordLanguage(serverSettings.lang, "ERROR"))] });
                }

                let petInfo = await interaction.client.databaseSelectData("select * from users_pet where pet_id = ?", [userInfo.pet_id]);
                petInfo = petInfo[0];

                let newHappiness = petInfo.happiness + amount * 10;

                if (newHappiness > petInfo.max_happiness) {
                    newHappiness = petInfo.max_happiness;
                }

                console.log(newHappiness);

                await interaction.client.databaseEditData("update users_pet set happiness = ? where user_id = ? and pet_id = ?", [newHappiness, interaction.user.id, userInfo.pet_id]);
                usedItem = true;
            }
            else {
                return await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_USE_BLOCK'), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))] });
            }

            if (usedItem) {
                await interaction.client.databaseEditData("update user_inventory set quantity = quantity - ? where user_id = ? and item_name = ?", [amount, userInfo.user_id, itemInfo.item_name]);
                await userDailyLogger(interaction, interaction.user, "use", "Used " + amount + " " + itemInfo.item_name.replaceAll("_", " ") + ".");
                return await interaction.editReply({ embeds: [interaction.client.greenEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ITEM_USED').format(amount, itemInfo.item_name.replaceAll("_", " ")), interaction.client.getWordLanguage(serverSettings.lang, 'SUCCESS'))], components: [] });
            }
        } catch (error) {
            let errorID = await errorLog.error(error, interaction);
            await interaction.editReply({ embeds: [interaction.client.redEmbed(interaction.client.getWordLanguage(serverSettings.lang, 'ERROR_NORMAL_ID').format(errorID), interaction.client.getWordLanguage(serverSettings.lang, 'ERROR'))], ephemeral: true });
        }
    }
}

const rowYesNo = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('yes')
            .setLabel('YES')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('no')
            .setLabel('NO')
            .setStyle('DANGER'),
    );

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
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