require('dotenv').config();

const express = require('express');
const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
} = require('discord.js');


// =====================
// Render Web Server
// =====================

const app = express();

app.get('/', (req, res) => {
    res.send('Beloved bot is online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Web server running on port ${process.env.PORT || 3000}`);
});


// =====================
// Discord Client
// =====================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


// Users allowed to use panic
const allowedUsers = [
    '756261049082314903',
    '1314713632457752636',
    '1458194798589509729',
];


// =====================
// Bot Ready
// =====================

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


// =====================
// Ping Replies
// =====================

client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;


    if (message.mentions.has(client.user)) {

        const replies = [
            "hey cutie 😌",
            "you called? 👀",
            "yes boss 🫡",
            "did someone summon me?",
            "beep boop 🤖",
            "welcome to the boulevard its beloved 🖤",
            "blvd forever 🖤",
            "panic mode ready 🚨",
            "bro woke me up 💀",
            "another ping? seriously? 😭",
            "my CPU is blushing rn",
            "Beloved reporting for duty 🫡",
        ];


        await message.reply(
            replies[Math.floor(Math.random() * replies.length)]
        );

    }

});


// =====================
// Slash Commands
// =====================

client.on(Events.InteractionCreate, async (interaction) => {


    if (!interaction.isChatInputCommand()) return;



    // =====================
    // PANIC
    // =====================

    if (interaction.commandName === 'panic') {


        if (!allowedUsers.includes(interaction.user.id)) {

            return interaction.reply({
                content: "❌ You cannot use panic mode.",
                ephemeral: true,
            });

        }


        await interaction.reply(
            "🚨 Panic mode activating..."
        );


        let locked = 0;


        for (const channel of interaction.guild.channels.cache.values()) {


            try {


                if (!channel.isTextBased()) continue;



                // Lock every role
                for (const role of interaction.guild.roles.cache.values()) {


                    // Skip @everyone
                    if (role.id === interaction.guild.id) continue;


                    // Don't lock admin roles
                    if (
                        allowedUsers.some(id =>
                            interaction.guild.members.cache
                                .get(id)
                                ?.roles.cache.has(role.id)
                        )
                    ) {
                        continue;
                    }



                    await channel.permissionOverwrites.edit(
                        role,
                        {
                            SendMessages: false,
                            SendMessagesInThreads: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false,
                        }
                    );

                }



                // Lock everyone
                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: false,
                        SendMessagesInThreads: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                    }
                );


                locked++;


            } catch (err) {

                console.error(
                    `Failed locking ${channel.name}`,
                    err
                );

            }

        }


        await interaction.editReply(
            `🚨 Panic Mode Enabled\n🔒 Locked ${locked} channels`
        );

    }




    // =====================
    // UNPANIC
    // =====================

    if (interaction.commandName === 'unpanic') {


        if (!allowedUsers.includes(interaction.user.id)) {

            return interaction.reply({
                content: "❌ You cannot use unpanic.",
                ephemeral: true,
            });

        }


        await interaction.reply(
            "🔓 Removing lockdown..."
        );


        let unlocked = 0;



        for (const channel of interaction.guild.channels.cache.values()) {


            try {


                if (!channel.isTextBased()) continue;



                for (const overwrite of channel.permissionOverwrites.cache.values()) {


                    await channel.permissionOverwrites.delete(
                        overwrite.id
                    );


                }


                unlocked++;


            } catch (err) {

                console.error(
                    `Failed unlocking ${channel.name}`,
                    err
                );

            }

        }


        await interaction.editReply(
            `🔓 Panic disabled\nUnlocked ${unlocked} channels`
        );

    }




    // =====================
    // VIBE COMMAND
    // =====================

    if (interaction.commandName === 'vibe') {


        const vibes = [
            "🖤 Beloved is feeling unstoppable",
            "🔥 Boulevard energy detected",
            "😎 Maximum vibes achieved",
            "💀 Chaos mode ready",
            "✨ Certified blvd moment",
            "🚨 Something suspicious is happening",
            "🫡 Beloved online",
        ];


        await interaction.reply(
            vibes[Math.floor(Math.random() * vibes.length)]
        );

    }


});


client.login(process.env.TOKEN);
