require('dotenv').config();

const express = require('express');
const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
} = require('discord.js');


// Render web server
const app = express();

app.get('/', (req, res) => {
    res.send('Beloved bot is online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Web server running on port ${process.env.PORT || 3000}`);
});


// Discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


// Users allowed to use panic commands
const allowedUsers = [
    '756261049082314903',
    '1314713632457752636',
    '1458194798589509729',
];


// Bot ready
client.once(Events.ClientReady, () => {

    console.log(`Beloved ready as ${client.user.tag}`);

    client.user.setPresence({
        activities: [
            {
                name: 'blvd',
                type: ActivityType.Watching,
            },
        ],
        status: 'online',
    });

});


// Ping replies
client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;


    if (message.mentions.has(client.user)) {

        const replies = [
            "hey cutie 😌",
            "you called? 👀",
            "yes boss? 🫡",
            "did someone summon me? 😭",
            "beep boop, i'm alive 🤖",
            "what's up legend?",
            "i was just chilling lol",
            "need something? 👀",
            "i have been summoned ✨",
            "bro woke me up 💀",
            "my CPU is blushing rn",
            "404: chill not found",
            "welcome to the boulevard its beloved 🖤",
            "blvd forever 🖤",
            "panic mode ready 🚨",
            "another ping? seriously? 💀"
        ];


        const reply = replies[
            Math.floor(Math.random() * replies.length)
        ];


        await message.reply(reply);
    }

});


// Slash commands
client.on(Events.InteractionCreate, async (interaction) => {


    if (!interaction.isChatInputCommand()) return;



    // PANIC
    if (interaction.commandName === 'panic') {


        if (!allowedUsers.includes(interaction.user.id)) {

            return interaction.reply({
                content: "❌ You don't have permission to use panic mode.",
                ephemeral: true,
            });

        }


        await interaction.reply("🚨 Locking all channels...");


        let locked = 0;


        const verifiedRole = interaction.guild.roles.cache.find(
            role => role.name.toLowerCase() === "verified"
        );


        for (const channel of interaction.guild.channels.cache.values()) {

            try {

                if (!channel.isTextBased()) continue;


                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: false,
                        SendMessagesInThreads: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                    }
                );


                if (verifiedRole) {

                    await channel.permissionOverwrites.edit(
                        verifiedRole,
                        {
                            SendMessages: false,
                            SendMessagesInThreads: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false,
                        }
                    );

                }


                locked++;


            } catch (err) {
                console.log(err);
            }

        }


        await interaction.editReply(
            `🚨 Panic Mode Enabled\n🔒 Locked ${locked} channels`
        );

    }




    // UNPANIC
    if (interaction.commandName === 'unpanic') {


        if (!allowedUsers.includes(interaction.user.id)) {

            return interaction.reply({
                content: "❌ You don't have permission to use unpanic.",
                ephemeral: true,
            });

        }


        await interaction.reply("🔓 Unlocking channels...");


        let unlocked = 0;


        const verifiedRole = interaction.guild.roles.cache.find(
            role => role.name.toLowerCase() === "verified"
        );


        for (const channel of interaction.guild.channels.cache.values()) {

            try {

                if (!channel.isTextBased()) continue;


                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: null,
                        SendMessagesInThreads: null,
                        CreatePublicThreads: null,
                        CreatePrivateThreads: null,
                    }
                );


                if (verifiedRole) {

                    await channel.permissionOverwrites.edit(
                        verifiedRole,
                        {
                            SendMessages: null,
                            SendMessagesInThreads: null,
                            CreatePublicThreads: null,
                            CreatePrivateThreads: null,
                        }
                    );

                }


                unlocked++;


            } catch (err) {
                console.log(err);
            }

        }


        await interaction.editReply(
            `🔓 Panic Mode Disabled\nUnlocked ${unlocked} channels`
        );

    }





    // VIBE COMMAND
    if (interaction.commandName === "vibe") {


        const vibes = [
            "🖤 Beloved is feeling dangerous today",
            "🔥 The boulevard is alive",
            "😎 Maximum vibes detected",
            "💀 Someone let me cook",
            "✨ Certified blvd moment",
            "🚨 Chaos levels: acceptable",
            "🫡 Beloved reporting for duty"
        ];


        const vibe = vibes[
            Math.floor(Math.random() * vibes.length)
        ];


        await interaction.reply(vibe);

    }


});


client.login(process.env.TOKEN);
