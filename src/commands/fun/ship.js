const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ship")
        .setDescription("Ship two people")
        .addUserOption(opt => opt.setName("one").setDescription("First person").setRequired(true))
        .addUserOption(opt => opt.setName("two").setDescription("Second person").setRequired(true)),

    async execute(interaction) {
        const one = interaction.options.getUser("one");
        const two = interaction.options.getUser("two");
        const score = Math.floor(Math.random() * 101);
        const result = score > 80 ? "\u{1F48D} Soulmate detected."
            : score > 50 ? "\u{1F495} Could survive a shopping trip together."
            : "\u{1F480} Beloved recommends friendship.";
        return interaction.reply(`\u{1F498} ${one} + ${two}\n\u2764\uFE0F Compatibility: ${score}%\n${result}`);
    }
};
