const { SlashCommandBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("love")
        .setDescription("Give someone Beloved's love")
        .addUserOption(opt => opt.setName("user").setDescription("Person").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const replies = [
            `\u{1F496} ${user} has been blessed by Beloved. Use this power wisely.`,
            `\u{1F495} Beloved scanned ${user}. Result: dangerously lovable.`,
            `\u{1F339} ${user} has unlocked premium friendship mode.`,
            `\u2764\uFE0F ${user} is now 12% more amazing.`
        ];
        return interaction.reply(randomItem(replies));
    }
};
