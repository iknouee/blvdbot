require("dotenv").config();

const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const logger = require("./utils/logger");
const { loadCommands } = require("./utils/commandHandler");
const { closeDatabase } = require("./utils/database");

// ─── Web Server (health check) ────────────────────────────────────────────────

const app = express();

app.get("/", (req, res) => res.send("💖 Beloved is online"));

app.get("/health", (req, res) =>
    res.json({
        status: "ok",
        uptime: process.uptime()
    })
);

app.listen(process.env.PORT || 3000, () =>
    logger.info(
        "Server",
        `Web server running on port ${process.env.PORT || 3000}`
    )
);

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
const { commands, categories } = loadCommands(commandsDir);

client.commands = commands;
client.categories = categories;

// ─── Load Events ─────────────────────────────────────────────────────────────

const eventsDir = path.join(__dirname, "events");
const fs = require("fs");

const eventFiles = fs
    .readdirSync(eventsDir)
    .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(path.join(eventsDir, file));

    if (event.once) {
        client.once(event.name, (...args) =>
            event.execute(...args, client)
        );
    } else {
        client.on(event.name, (...args) =>
            event.execute(...args, client)
        );
    }

    logger.debug("Events", `Registered event: ${event.name}`);
}

// ─── Panto Auto Reply ────────────────────────────────────────────────────────

client.on("messageCreate", async message => {
    // Don't reply to bots
    if (message.author.bot) return;

    // Detect "panto" as a word, case-insensitive
    if (/\bpanto\b/i.test(message.content)) {
        try {
            await message.reply("panto says he misses yall 💔");
        } catch (error) {
            logger.error(
                "PantoReply",
                `Failed to reply: ${error.message}`
            );
        }
    }
});

// ─── Error Handling ──────────────────────────────────────────────────────────

process.on("unhandledRejection", error => {
    logger.error(
        "Process",
        `Unhandled promise rejection: ${error?.message || error}`,
        { stack: error?.stack }
    );
});

process.on("uncaughtException", error => {
    logger.error(
        "Process",
        `Uncaught exception: ${error.message}`,
        { stack: error.stack }
    );
});

process.on("SIGINT", () => {
    logger.info("Process", "Shutting down...");
    closeDatabase();
    client.destroy();
    process.exit(0);
});

process.on("SIGTERM", () => {
    logger.info("Process", "Shutting down...");
    closeDatabase();
    client.destroy();
    process.exit(0);
});

// ─── Login ───────────────────────────────────────────────────────────────────

client.login(process.env.TOKEN);
