const { Events } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
    name: Events.MessageReactionAdd,

    async execute(reaction, user, client) {
        try {
            if (user.bot) return;
            if (reaction.partial) await reaction.fetch().catch(() => null);
            if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

            const countryCmd = client.commands.get("countrygame");
            if (!countryCmd) return;
            if (reaction.emoji.name !== countryCmd.COUNTRY_JOIN_EMOJI) return;

            const game = [...countryCmd.activeGames.values()].find(g => g.message?.id === reaction.message.id);
            if (!game || game.status !== "lobby") return;

            if (!game.players.has(user.id)) {
                game.players.set(user.id, { id: user.id, lives: game.startingLives, score: 0, misses: 0, eliminated: false });
                // Update lobby embed
                const { belovedEmbed } = require("../utils/embeds");
                await game.message.edit({
                    embeds: [require("../commands/games/countrygame").lobbyEmbed ?
                        game.message.embeds[0] : game.message.embeds[0]],
                }).catch(() => {});
            }
        } catch (error) {
            logger.error("ReactionAdd", `Country join error: ${error.message}`);
        }
    }
};
