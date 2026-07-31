const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rate")
        .setDescription("Rate someone")
        .addUserOption(opt => opt.setName("user").setDescription("Person").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        return interaction.reply(
            `\u2B50 ${user} rating:\n\n` +
            `Coolness: ${Math.floor(Math.random() * 101)}%\n` +
            `Chaos: ${Math.floor(Math.random() * 101)}%\n` +
            `Beloved approval: ${Math.floor(Math.random() * 101)}%`
        );
    }
};
