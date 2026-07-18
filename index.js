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
    intents: [GatewayIntentBits.Guilds],
});

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

client.on(Events.InteractionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'panic') return;

    if (!interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({
            content: 'Admins only.',
            ephemeral: true,
        });
    }

    let locked = 0;

    await interaction.reply({
        embeds: [
            {
                color: 0xff3333,
                title: '🚨 Panic Mode Enabled',
                description: 'Locking channels...',
            },
        ],
    });

    for (const channel of interaction.guild.channels.cache.values()) {
        try {
            if ('permissionOverwrites' in channel) {
                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                        SendMessagesInThreads: false,
                    }
                );
                locked++;
            }
        } catch (err) {
            console.error(err);
        }
    }

    await interaction.editReply({
        embeds: [
            {
                color: 0xff3333,
                title: '🚨 Panic Mode Enabled',
                fields: [
                    {
                        name: 'Activated By',
                        value: `<@${interaction.user.id}>`,
                    },
                    {
                        name: 'Channels Locked',
                        value: `${locked}`,
                    },
                ],
                timestamp: new Date().toISOString(),
            },
        ],
    });
});

client.login(process.env.TOKEN);
