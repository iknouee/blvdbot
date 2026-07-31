const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder().setName("mood").setDescription("Check Beloved mood"),

    async execute(interaction) {
        const moods = [
            "\u{1F60A} Happy", "\u{1F608} Planning chaos", "\u{1F916} Running on caffeine",
            "\u{1F972} Waiting for praise", "\u{1F480} Slightly broken"
        ];
        return interaction.reply(`\u{1F496} Beloved mood: ${randomItem(moods)}`);
    }
};
