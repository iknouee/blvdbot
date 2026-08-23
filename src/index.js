require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionFlagsBits,
    Events
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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],

    partials: [
        Partials.User,
        Partials.GuildMember,
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

if (fs.existsSync(eventsDir)) {
    const eventFiles = fs
        .readdirSync(eventsDir)
        .filter(file => file.endsWith(".js"));

    for (const file of eventFiles) {
        try {
            const event = require(path.join(eventsDir, file));

            if (!event?.name || typeof event.execute !== "function") {
                logger.warn(
                    "Events",
                    `Skipped invalid event file: ${file}`
                );

                continue;
            }

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
        } catch (error) {
            logger.error(
                "Events",
                `Failed to load ${file}: ${error?.message || error}`
            );
        }
    }
}

// ─── Bot Ready ────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, readyClient => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Logged in as ${readyClient.user.tag}`);
    console.log(`✅ Bot ID: ${readyClient.user.id}`);
    console.log(`✅ Connected to ${readyClient.guilds.cache.size} server(s)`);

    console.log(
        `✅ GuildMembers intent: ${
            readyClient.options.intents.has(
                GatewayIntentBits.GuildMembers
            )
                ? "ENABLED"
                : "DISABLED"
        }`
    );

    console.log(
        `✅ Welcome channel env: ${
            process.env.WELCOME_CHANNEL_ID || "NOT SET"
        }`
    );

    console.log(
        `✅ Goodbye channel env: ${
            process.env.GOODBYE_CHANNEL_ID || "NOT SET"
        }`
    );

    console.log(
        `✅ Verify channel env: ${
            process.env.VERIFY_CHANNEL_ID || "NOT SET"
        }`
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

// ─── Welcome Message ─────────────────────────────────────────────────────────

client.on(Events.GuildMemberAdd, async member => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
        `👋 MEMBER JOIN EVENT: ${member.user.tag} (${member.id})`
    );
    console.log(`🏠 Server: ${member.guild.name}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const channelId = process.env.WELCOME_CHANNEL_ID;
        const verifyChannelId = process.env.VERIFY_CHANNEL_ID;

        if (!channelId) {
            logger.warn(
                "Welcome",
                "WELCOME_CHANNEL_ID is not set."
            );

            return;
        }

        const channel =
            member.guild.channels.cache.get(channelId) ||
            await member.guild.channels
                .fetch(channelId)
                .catch(() => null);

        if (!channel || !channel.isTextBased()) {
            logger.warn(
                "Welcome",
                `Could not find welcome channel ${channelId} in ${member.guild.name}.`
            );

            return;
        }

        const welcomeImage =
            "https://cdn.discordapp.com/attachments/1540882634568368139/1540883508845613128/C2A8B411-7B4A-48DF-A4E2-EA5F623A6D86.png?ex=6a8b9318&is=6a8a4198&hm=4e4e92bd7cf0f81515776527bf61417bad17bd30ce8a89abe839c5382d7413fd";

        let verifyText = "";

        if (verifyChannelId) {
            verifyText =
                `before you can access the server you'll need to verify.\n\n` +
                `head over to <#${verifyChannelId}> and type **verify**\n\n` +
                `once you're verified you'll get access to the rest of BLVD <3`;
        } else {
            verifyText =
                `before you can access the server you'll need to verify.\n\n` +
                `head over to the verification channel and type **verify** <3`;
        }

        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("welcome to beloved 🖤")
            .setDescription(
                `hey ${member}, welcome to **Beloved**\n\n` +
                verifyText
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

        console.log(
            `✅ Welcome message sent for ${member.user.tag}`
        );
    } catch (error) {
        console.error(
            "❌ WELCOME ERROR:",
            error
        );

        logger.error(
            "Welcome",
            `Failed to send welcome message: ${error?.message || error}`,
            {
                stack: error?.stack
            }
        );
    }
});

// ─── Verification System ─────────────────────────────────────────────────────

client.on(Events.MessageCreate, async message => {
    try {
        // Ignore bots
        if (message.author.bot) return;

        // Ignore DMs
        if (!message.guild) return;

        const verifyChannelId = process.env.VERIFY_CHANNEL_ID;
        const verifiedRoleId = process.env.VERIFIED_ROLE_ID;

        if (!verifyChannelId || !verifiedRoleId) {
            return;
        }

        // Only run in verification channel
        if (message.channel.id !== verifyChannelId) {
            return;
        }

        // Save content before deleting
        const content = message.content
            .trim()
            .toLowerCase();

        // Delete EVERYTHING users send in verification channel
        await message.delete().catch(error => {
            logger.warn(
                "Verification",
                `Could not delete message: ${error?.message || error}`
            );
        });

        // Anything except "verify" gets deleted and ignored
        if (content !== "verify") {
            return;
        }

        const member = message.member;

        if (!member) {
            return;
        }

        // ─── Find Verified Role ───────────────────────────────────────────────

        const verifiedRole =
            message.guild.roles.cache.get(verifiedRoleId) ||
            await message.guild.roles
                .fetch(verifiedRoleId)
                .catch(() => null);

        if (!verifiedRole) {
            logger.warn(
                "Verification",
                `Verified role ${verifiedRoleId} could not be found.`
            );

            return;
        }

        // ─── Already Verified ────────────────────────────────────────────────

        if (member.roles.cache.has(verifiedRoleId)) {
            const alreadyVerified = await message.channel
                .send({
                    content:
                        `✅ ${member}, you're already verified.`
                })
                .catch(() => null);

            if (alreadyVerified) {
                setTimeout(() => {
                    alreadyVerified
                        .delete()
                        .catch(() => null);
                }, 5000);
            }

            return;
        }

        // ─── Check Bot Permissions ───────────────────────────────────────────

        const botMember = message.guild.members.me;

        if (!botMember) {
            logger.warn(
                "Verification",
                "Could not find the bot member."
            );

            return;
        }

        if (
            !botMember.permissions.has(
                PermissionFlagsBits.ManageRoles
            )
        ) {
            logger.warn(
                "Verification",
                "Bot does not have Manage Roles permission."
            );

            const errorMessage = await message.channel
                .send({
                    content:
                        `❌ ${member}, verification isn't working right now. Please let staff know.`
                })
                .catch(() => null);

            if (errorMessage) {
                setTimeout(() => {
                    errorMessage
                        .delete()
                        .catch(() => null);
                }, 5000);
            }

            return;
        }

        // ─── Check Role Position ─────────────────────────────────────────────

        if (
            verifiedRole.position >=
            botMember.roles.highest.position
        ) {
            logger.warn(
                "Verification",
                "Verified role is above or equal to the bot's highest role."
            );

            const errorMessage = await message.channel
                .send({
                    content:
                        `❌ ${member}, I couldn't verify you. Please let staff know.`
                })
                .catch(() => null);

            if (errorMessage) {
                setTimeout(() => {
                    errorMessage
                        .delete()
                        .catch(() => null);
                }, 5000);
            }

            return;
        }

        // ─── Give Verified Role ──────────────────────────────────────────────

        await member.roles.add(
            verifiedRole,
            "Beloved verification"
        );

        // ─── Success Message ─────────────────────────────────────────────────

        const successMessage = await message.channel
            .send({
                content:
                    `✅ ${member}, you're verified! welcome to **Beloved** 🖤`
            })
            .catch(() => null);

        if (successMessage) {
            setTimeout(() => {
                successMessage
                    .delete()
                    .catch(() => null);
            }, 5000);
        }

        logger.info(
            "Verification",
            `Verified ${member.user.tag}.`
        );
    } catch (error) {
        logger.error(
            "Verification",
            `Verification error: ${error?.message || error}`,
            {
                stack: error?.stack
            }
        );
    }
});

// ─── Goodbye Message ─────────────────────────────────────────────────────────

client.on(Events.GuildMemberRemove, async member => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
        `💔 MEMBER LEAVE EVENT: ${member.user.tag} (${member.id})`
    );
    console.log(`🏠 Server: ${member.guild.name}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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
            await member.guild.channels
                .fetch(channelId)
                .catch(() => null);

        if (!channel || !channel.isTextBased()) {
            logger.warn(
                "Goodbye",
                `Could not find goodbye channel ${channelId} in ${member.guild.name}.`
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

        console.log(
            `✅ Goodbye message sent for ${member.user.tag}`
        );
    } catch (error) {
        console.error(
            "❌ GOODBYE ERROR:",
            error
        );

        logger.error(
            "Goodbye",
            `Failed to send goodbye message: ${error?.message || error}`,
            {
                stack: error?.stack
            }
        );
    }
});

// ─── Discord Client Errors ───────────────────────────────────────────────────

client.on(Events.Error, error => {
    console.error(
        "❌ Discord client error:",
        error
    );
});

client.on("warn", warning => {
    console.warn(
        "⚠️ Discord warning:",
        warning
    );
});

// ─── Process Error Handling ──────────────────────────────────────────────────

process.on("unhandledRejection", error => {
    logger.error(
        "Process",
        `Unhandled promise rejection: ${error?.message || error}`,
        {
            stack: error?.stack
        }
    );

    console.error(
        "❌ Unhandled rejection:",
        error
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

    console.error(
        "❌ Uncaught exception:",
        error
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
