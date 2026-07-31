const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Magic 8 ball")
        .addStringOption(opt => opt.setName("question").setDescription("Question").setRequired(true)),

    async execute(interaction) {
        const question = interaction.options.getString("question");
        const answers = ["Yes", "No", "Maybe", "Definitely", "Ask again later", "Your toaster knows"];
        return interaction.reply(`\u{1F3B1} **${question}**\n\n${randomItem(answers)}`);
    }
};
