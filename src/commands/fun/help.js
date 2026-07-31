const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("See all Beloved commands organized by category"),

    async execute(interaction, client) {
        const embed = belovedEmbed("\u{1F496} Beloved Command Menu")
            .setDescription("Here's everything I can do. Use `/command` to run any of them.")
            .addFields(
                {
                    name: "\u{1F3AD} Fun",
                    value: "`/love` `/roast` `/compliment` `/ship` `/vibe` `/fortune` `/mood` `/ask` `/8ball` `/rate` `/tweet` `/cancel` `/wheel` `/beef`",
                    inline: false
                },
                {
                    name: "\u{1F4B0} Economy",
                    value: "`/balance` `/daily` `/work` `/beg` `/pay` `/coinleaderboard`",
                    inline: false
                },
                {
                    name: "\u{1F3B0} Casino",
                    value: "`/slots` `/coinflip` `/roulette` `/blackjack`",
                    inline: false
                },
                {
                    name: "\u{1F48D} Marriage",
                    value: "`/marry` `/divorce` `/married` `/kiss` `/hug` `/date` `/gift` `/ring buy`",
                    inline: false
                },
                {
                    name: "\u{1F3AE} Games",
                    value: "`/smashorpass` `/court` `/fight` `/redlight` `/countrygame`",
                    inline: false
                },
                {
                    name: "\u{1F6E1}\uFE0F Moderation",
                    value: "`/blacklist` `/conflict` `/say`\n*Requires Manage Guild/Messages permission*",
                    inline: false
                }
            )
            .setFooter({ text: "Beloved \u2022 Built with love and questionable decisions" });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
