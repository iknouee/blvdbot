const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder().setName("coinleaderboard").setDescription("See the richest people in the server"),

    async execute(interaction) {
        const rows = economy.getLeaderboard(interaction.guild.id, 10);

        const description = rows.length
            ? rows.map((row, i) => `${["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || `**${i + 1}.**`} <@${row.user_id}>\u3000**${coins(row.total)}**`).join("\n")
            : "Nobody has opened a wallet yet.";

        return interaction.reply({
            embeds: [belovedEmbed("\u{1F451} Beloved Rich List")
                .setDescription(description)
                .setFooter({ text: "Rich today, destroyed by slots tomorrow" })],
            allowedMentions: { parse: [] }
        });
    }
};
