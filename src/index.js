require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Partials
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

// ─── Panto Auto Reply ────────────────────────────────────────────────────────

client.on("messageCreate", async message => {

    // Don't reply to bots
    if (message.author.bot) return;

    // Detect "panto"
    if (/\bpanto\b/i.test(message.content)) {
        try {
            await message.reply(
                "bro summoned panto 😭"
            );
        } catch (error) {
            logger.error(
                "PantoReply",
                `Failed to reply: ${error.message}`
            );
        }
    }
});

// ─── Panto Return Message ────────────────────────────────────────────────────

client.once("ready", async () => {

    logger.info(
        "PantoReturn",
        `Bot ready as ${client.user.tag}`
    );

    const channelId = process.env.MAIN_CHAT_CHANNEL_ID;

    if (!channelId) {
        logger.error(
            "PantoReturn",
            "MAIN_CHAT_CHANNEL_ID is missing from environment variables."
        );

        return;
    }

    try {

        logger.info(
            "PantoReturn",
            `Looking for channel ${channelId}...`
        );

        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            logger.error(
                "PantoReturn",
                "Could not find the main chat channel."
            );

            return;
        }

        if (!channel.isTextBased()) {
            logger.error(
                "PantoReturn",
                "The configured channel is not a text channel."
            );

            return;
        }

        logger.info(
            "PantoReturn",
            `Found channel #${channel.name}`
        );

        // Check recent messages so restarting the bot doesn't immediately
        // send the return message again.
        const recentMessages = await channel.messages.fetch({
            limit: 100
        });

        const alreadySent = recentMessages.some(message =>
            message.author.id === client.user.id &&
            message.content.includes("panto is back. for good")
        );

        if (alreadySent) {
            logger.info(
                "PantoReturn",
                "Return message has already been posted."
            );

            return;
        }

        const returnMessage = `**panto is back 🤍**

well that retirement lasted long 😭

panto is officially back in blvd and this time hes staying

no dramatic leaving speech
no disappearing
no rip panto

bros alive again 😭

missed u lot tho fr

**panto is back. for good 🤍**`;

        await channel.send(returnMessage);

        logger.info(
            "PantoReturn",
            "✅ Panto return message sent!"
        );

    } catch (error) {

        logger.error(
            "PantoReturn",
            `Failed to send return message: ${error.message}`,
            {
                stack: error.stack
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
