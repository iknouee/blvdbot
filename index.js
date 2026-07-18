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


// Random replies when pinged
client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;


    if (message.mentions.has(client.user)) {

        const replies = [
            "hey cutie 😌",
            "you called? 👀",
            "yes boss? 🫡",
            "hello there ✨",
            "did someone say my name? 😭",
            "beep boop, i'm alive 🤖",
            "what's up legend?",
            "sup 😎",
            "i was just chilling lol",
            "need something? 👀",
            "yo yo yo",
            "hello handsome/beautiful 😌",
            "at your service 🫡",
            "omg hi",
            "don't ping me unless you love me 💅",
            "i have been summoned ✨",
            "the bot has arrived 🚨",
            "hey hey 👋",
            "what can i do for you?",
            "you rang? 📞",
            "bro woke me up 💀",
            "i'm literally just code 😭",
            "another ping? seriously? 💀",
            "my CPU is blushing rn",
            "404: chill not found",
            "i have feelings (probably)",
            "blvd forever 🖤",
            "welcome to the boulevard",
            "verified gang rise up",
            "panic mode ready 🚨"
        ];


        const randomReply = replies[
            Math.floor(Math.random() * replies.length)
        ];


        await message.reply(randomReply);
    }

});



// Slash commands
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isChatInputCommand()) return;



    // =====================
    // PANIC
    // =====================
    if (interaction.commandName === 'panic') {


        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({
                content: 'Admins only.',
                ephemeral: true,
            });
        }


        await interaction.reply({
            content: '🚨 Locking all channels...',
        });


        let locked = 0;


        const verifiedRole = interaction.guild.roles.cache.find(
            role => role.name.toLowerCase() === 'verified'
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
                console.error(`Failed locking ${channel.name}`, err);
            }
        }


        await interaction.editReply({
            content:
                `🚨 Panic Mode Enabled\n\n` +
                `🔒 Channels Locked: ${locked}\n` +
                `👥 Verified role locked: ${verifiedRole ? 'Yes' : 'No'}`
        });

    }



    // =====================
    // UNPANIC
    // =====================
    if (interaction.commandName === 'unpanic') {


        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({
                content: 'Admins only.',
                ephemeral: true,
            });
        }


        await interaction.reply({
            content: '🔓 Unlocking all channels...',
        });


        let unlocked = 0;


        const verifiedRole = interaction.guild.roles.cache.find(
            role => role.name.toLowerCase() === 'verified'
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
                console.error(`Failed unlocking ${channel.name}`, err);
            }
        }


        await interaction.editReply({
            content:
                `🔓 Panic Mode Disabled\n\n` +
                `Unlocked Channels: ${unlocked}`
        });

    }

});



client.login(process.env.TOKEN);
