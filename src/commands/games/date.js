const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { randomItem } = require("../../utils/helpers");
const marriageSys = require("../../systems/marriage");

module.exports = {
    data: new SlashCommandBuilder().setName("date").setDescription("Take your spouse on a random date"),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You need a spouse before going on a marriage date.", ephemeral: true });

        const dates = [
            ["\u{1F37F} Cinema Date", "You bought the tickets, then argued over who ate all the popcorn."],
            ["\u{1F35D} Fancy Dinner", "The waiter called you a cute couple. The bill was not cute."],
            ["\u{1F3A1} Theme Park", "You went on one scary ride and immediately regretted everything."],
            ["\u{1F305} Beach Date", "Romantic sunset, stolen chips, and sand absolutely everywhere."],
            ["\u{1F3AE} Gaming Date", "You promised not to rage. That promise lasted four minutes."],
            ["\u{1F6CD}\uFE0F Shopping Date", "You went in for one thing and left financially ruined."],
            ["\u2708\uFE0F Surprise Holiday", "Beloved booked it. Nobody checked whether either of you had a passport."]
        ];
        const [title, text] = randomItem(dates);
        marriageSys.update(interaction.guild.id, interaction.user.id, { dates: (m.dates || 0) + 1 });

        return interaction.reply({
            embeds: [belovedEmbed(title).setDescription(`<@${interaction.user.id}> took <@${m.partner_id}> on a date!\n\n${text}`)],
            allowedMentions: { users: [m.partner_id] }
        });
    }
};
