const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Roast someone")
        .addUserOption(opt => opt.setName("user").setDescription("Person").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const replies = [
            `\u{1F525} ${user} has the confidence of someone who skips tutorials.`,
            `\u{1F480} ${user}'s brain is running on free trial mode.`,
            `\u{1F62D} ${user} probably says "trust me" before disasters.`,
            `\u{1F525} Beloved checked ${user}. The results were deleted.`
        ];
        return interaction.reply(randomItem(replies));
    }
};
