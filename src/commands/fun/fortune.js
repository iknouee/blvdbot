const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder().setName("fortune").setDescription("Get a weird fortune"),

    async execute(interaction) {
        const fortunes = [
            "\u{1F52E} You will find happiness near food.",
            "\u{1F52E} Someone will compliment you today.",
            "\u{1F52E} Your future contains questionable decisions.",
            "\u{1F52E} A mysterious snack awaits you."
        ];
        return interaction.reply(randomItem(fortunes));
    }
};
