require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
} = require("discord.js");

const logger = require("./utils/logger");
const { loadCommands } = require("./utils/commandHandler");
const { closeDatabase } = require("./utils/database");

// ─── Web Server ──────────────────────────────────────────────────────────────

const app = express();

app.get("/", (req, res) => {
    res.send("💖 Beloved is online");
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime()
    });
});

app.listen(process.env.PORT || 3000, () => {
    logger.info(
        "Server",
        `Web server running on port ${process.env.PORT || 3000}`
    );
});

// ─── Discord Client ──────────────────────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],

    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

// ─── Load Commands ───────────────────────────────────────────────────────────

const commandsDir = path.join(__dirname, "commands");

const {
    commands,
    categories
} = loadCommands(commandsDir);

client.commands = commands;
client.categories = categories;

// ─── Load Events ─────────────────────────────────────────────────────────────

const eventsDir = path.join(__dirname, "events");

const eventFiles = fs
    .readdirSync(eventsDir)
    .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(path.join(eventsDir, file));

    if (event.once) {
        client.once(event.name, (...args) => {
            event.execute(...args, client);
        });
    } else {
        client.on(event.name, (...args) => {
            event.execute(...args, client);
        });
    }

    logger.debug(
        "Events",
        `Registered event: ${event.name}`
    );
}

// ─── Welcome Message ─────────────────────────────────────────────────────────

client.on("guildMemberAdd", async member => {
    try {
        const channelId = process.env.WELCOME_CHANNEL_ID;

        if (!channelId) {
            logger.warn(
                "Welcome",
                "WELCOME_CHANNEL_ID is not set."
            );
            return;
        }

        const channel =
            member.guild.channels.cache.get(channelId) ||
            await member.guild.channels.fetch(channelId).catch(() => null);

        if (!channel || !channel.isTextBased()) {
            logger.warn(
                "Welcome",
                `Could not find welcome channel in ${member.guild.name}.`
            );
            return;
        }

        const welcomeImage =
            "https://cdn.discordapp.com/attachments/1540882634568368139/1540883508845613128/C2A8B411-7B4A-48DF-A4E2-EA5F623A6D86.png?ex=6a8b9318&is=6a8a4198&hm=4e4e92bd7cf0f81515776527bf61417bad17bd30ce8a89abe839c5382d7413fd";

        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("welcome to beloved 🖤")
            .setDescription(
                `hey ${member}, welcome to **Beloved**\n\n` +
                `before you get started, make sure you verify so you can access the server.\n\n` +
                `go to <#1499900580431396987> and type **verify**\n\n` +
                `welcome to BLVD <3`
            )
            .setImage(welcomeImage)
            .setFooter({
                text: `BLVD • member #${member.guild.memberCount}`
            })
            .setTimestamp();

        await channel.send({
            content: `${member}`,
            embeds: [embed]
        });

        logger.info(
            "Welcome",
            `Welcomed ${member.user.tag} to ${member.guild.name}.`
        );

    } catch (error) {
        logger.error(
            "Welcome",
            `Failed to send welcome message: ${error?.message || error}`,
            {
                stack: error?.stack
            }
        );
    }
});

// ─── Goodbye Message ─────────────────────────────────────────────────────────

client.on("guildMemberRemove", async member => {
    try {
        const channelId = process.env.GOODBYE_CHANNEL_ID;

        if (!channelId) {
            logger.warn(
                "Goodbye",
                "GOODBYE_CHANNEL_ID is not set."
            );
            return;
        }

        const channel =
            member.guild.channels.cache.get(channelId) ||
            await member.guild.channels.fetch(channelId).catch(() => null);

        if (!channel || !channel.isTextBased()) {
            logger.warn(
                "Goodbye",
                `Could not find goodbye channel in ${member.guild.name}.`
            );
            return;
        }

        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("someone left beloved 💔")
            .setDescription(
                `**${member.user.username}** left the server\n\n` +
                `take care, maybe we'll see you again`
            )
            .setThumbnail(
                member.user.displayAvatarURL({
                    size: 256
                })
            )
            .setFooter({
                text: `BLVD • ${member.guild.memberCount} members`
            })
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

        logger.info(
            "Goodbye",
            `${member.user.tag} left ${member.guild.name}.`
        );

    } catch (error) {
        logger.error(
            "Goodbye",
            `Failed to send goodbye message: ${error?.message || error}`,
            {
                stack: error?.stack
            }
        );
    }
});

// ─── Error Handling ──────────────────────────────────────────────────────────

process.on("unhandledRejection", error => {
    logger.error(
        "Process",
        `Unhandled promise rejection: ${error?.message || error}`,
        {
            stack: error?.stack
        }
    );
});

process.on("uncaughtException", error => {
    logger.error(
        "Process",
        `Uncaught exception: ${error.message}`,
        {
            stack: error.stack
        }
    );
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

process.on("SIGINT", () => {
    logger.info(
        "Process",
        "Shutting down..."
    );

    closeDatabase();
    client.destroy();

    process.exit(0);
});

process.on("SIGTERM", () => {
    logger.info(
        "Process",
        "Shutting down..."
    );

    closeDatabase();
    client.destroy();

    process.exit(0);
});

// ─── Login ───────────────────────────────────────────────────────────────────

client.login(process.env.TOKEN);
