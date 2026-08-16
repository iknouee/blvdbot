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
                "panto says he misses yall 💔"
            );
        } catch (error) {
            logger.error(
                "PantoReply",
                `Failed to reply: ${error.message}`
            );
        }
    }
});

// ─── Panto Farewell ──────────────────────────────────────────────────────────

client.once("ready", async () => {

    logger.info(
        "PantoFarewell",
        `Bot ready as ${client.user.tag}`
    );

    const channelId = process.env.MAIN_CHAT_CHANNEL_ID;

    if (!channelId) {
        logger.error(
            "PantoFarewell",
            "MAIN_CHAT_CHANNEL_ID is missing from environment variables."
        );

        return;
    }

    try {

        logger.info(
            "PantoFarewell",
            `Looking for channel ${channelId}...`
        );

        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            logger.error(
                "PantoFarewell",
                "Could not find the main chat channel."
            );

            return;
        }

        if (!channel.isTextBased()) {
            logger.error(
                "PantoFarewell",
                "The configured channel is not a text channel."
            );

            return;
        }

        logger.info(
            "PantoFarewell",
            `Found channel #${channel.name}`
        );

        // Check recent messages so a simple restart doesn't send it again.
        const recentMessages = await channel.messages.fetch({
            limit: 100
        });

        const alreadySent = recentMessages.some(message =>
            message.author.id === client.user.id &&
            message.content.includes("a message from panto")
        );

        if (alreadySent) {
            logger.info(
                "PantoFarewell",
                "Farewell message has already been posted."
            );

            return;
        }

        const farewellMessage = `**a message from panto 🤍**

panto has officially left blvd

actually crazy saying that after everything 😭

he came into blvd not knowing what to expect and somehow ended up meeting some of the nicest people hes ever met. all the random vcs, staying up way too late, laughing over the dumbest stuff, helping people when they needed someone, stupid arguments and just random moments that nobody thought would actually become memories

those are the things hes never gonna forget

even if he never speaks to some of these people again, he'll always remember the time everyone was here together. some of you made his days better without even knowing it and blvd genuinely became a big part of his life for a while

it wasnt always good tho. being around these servers so much eventually started messing with his head and he knew it was probably time to leave and move on

but he doesnt regret any of it

the people he met, the laughs, the memories, the late nights, all of it was worth it. one day everyones gonna move on and blvd probably wont even be the same anymore, but he'll always be able to look back at this time and remember how good we actually had it 😭

so thank you to everyone who spoke to him, helped him, checked up on him, made him laugh or was just there. genuinely thank you for making these memories what they were

you probably wont see panto around anymore but he definitely wont forget you lot 🤍

what a fucking era man

rip panto lol 🕊️`;

        await channel.send(farewellMessage);

        logger.info(
            "PantoFarewell",
            "✅ Panto farewell message sent!"
        );

    } catch (error) {

        logger.error(
            "PantoFarewell",
            `Failed to send farewell message: ${error.message}`,
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
