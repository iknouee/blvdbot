const { Events } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                return await handleModal(interaction, client);
            }

            // Handle button interactions
            if (interaction.isButton()) {
                return await handleButton(interaction, client);
            }

            // Handle slash commands
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logger.warn("Interaction", `Unknown command: ${interaction.commandName}`);
                return;
            }

            await command.execute(interaction, client);
        } catch (error) {
            logger.error("Interaction", `Error in ${interaction.commandName || interaction.customId}: ${error.message}`, { stack: error.stack });

            const response = { content: "\u{1F480} Beloved crashed trying to be funny.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(response).catch(() => {});
            } else {
                await interaction.reply(response).catch(() => {});
            }
        }
    }
};

async function handleButton(interaction, client) {
    const customId = interaction.customId;

    // Route button interactions to appropriate command handlers
    if (customId.startsWith("blackjack:")) {
        const [, action, gameId] = customId.split(":");
        const bjCmd = client.commands.get("blackjack");
        if (bjCmd?.handleButton) return bjCmd.handleButton(interaction, action, gameId);
    }

    if (customId.startsWith("marry:")) {
        const [, choice, gameId] = customId.split(":");
        const marryCmd = client.commands.get("marry");
        if (marryCmd?.handleButton) return marryCmd.handleButton(interaction, choice, gameId);
    }

    if (customId.startsWith("court:")) {
        const [, vote, gameId] = customId.split(":");
        const courtCmd = client.commands.get("court");
        if (courtCmd?.handleButton) return courtCmd.handleButton(interaction, vote, gameId);
    }

    if (customId.startsWith("fightaccept:") || customId.startsWith("fight:")) {
        const parts = customId.split(":");
        const action = parts[1];
        const gameId = parts[2];
        const fightCmd = client.commands.get("fight");
        if (fightCmd?.handleButton) return fightCmd.handleButton(interaction, action, gameId);
    }

    if (customId.startsWith("sop:")) {
        const [, vote, gameId] = customId.split(":");
        const sopCmd = client.commands.get("smashorpass");
        if (sopCmd?.handleButton) return sopCmd.handleButton(interaction, vote, gameId);
    }

    if (customId.startsWith("rlgl:")) {
        const [, action, gameId] = customId.split(":");
        const rlglCmd = client.commands.get("redlight");
        if (rlglCmd?.handleButton) return rlglCmd.handleButton(interaction, action, gameId);
    }

    if (customId.startsWith("country:")) {
        const [, action, gameId] = customId.split(":");
        const countryCmd = client.commands.get("countrygame");
        if (countryCmd?.handleButton) return countryCmd.handleButton(interaction, action, gameId);
    }

    if (customId.startsWith("heist:")) {
        const [, action, gameId] = customId.split(":");
        const heistCmd = client.commands.get("heist");
        if (heistCmd?.handleButton) return heistCmd.handleButton(interaction, action, gameId);
    }

    if (customId.startsWith("paranoia:")) {
        const [, action, gameId] = customId.split(":");
        const paranoiaCmd = client.commands.get("paranoia");
        if (paranoiaCmd?.handleButton) return paranoiaCmd.handleButton(interaction, action, gameId);
    }
}

async function handleModal(interaction, client) {
    if (interaction.customId === "confess_modal") {
        const confessCmd = client.commands.get("confess");
        if (confessCmd?.handleModal) return confessCmd.handleModal(interaction);
    }
}
