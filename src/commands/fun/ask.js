const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask Beloved anything")
        .addStringOption(opt => opt.setName("question").setDescription("Question").setRequired(true)),

    async execute(interaction) {
        const question = interaction.options.getString("question");
        const answers = [
            "Probably \u{1F440}",
            "Beloved has consulted the toaster. Yes.",
            "No. Absolutely not.",
            "I have no idea but I support you.",
            "That question hurt my circuits."
        ];
        return interaction.reply(`\u2753 ${question}\n\n\u{1F496} ${randomItem(answers)}`);
    }
};
