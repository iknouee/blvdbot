const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("compliment")
        .setDescription("Compliment someone")
        .addUserOption(opt => opt.setName("user").setDescription("Person").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const replies = [
            `\u2728 ${user} has main character energy.`,
            `\u{1F48E} ${user} is officially approved by Beloved.`,
            `\u{1F31F} Scientists tried to measure ${user}'s greatness. They gave up.`,
            `\u{1FAE1} ${user} is actually built different.`
        ];
        return interaction.reply(randomItem(replies));
    }
};
