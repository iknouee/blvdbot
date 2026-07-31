const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder().setName("vibe").setDescription("Check Beloved vibes"),

    async execute(interaction) {
        const vibes = [
            "\u{1F525} Illegal levels of vibe detected.",
            "\u{1F60E} Maximum boulevard energy.",
            "\u{1F480} Suspicious but accepted.",
            "\u2728 Legendary vibes unlocked.",
            "\u{1F9C3} Vibe scanner exploded."
        ];
        return interaction.reply(randomItem(vibes));
    }
};
