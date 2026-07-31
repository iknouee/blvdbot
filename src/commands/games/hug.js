const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { randomItem } = require("../../utils/helpers");
const marriageSys = require("../../systems/marriage");

module.exports = {
    data: new SlashCommandBuilder().setName("hug").setDescription("Hug your spouse"),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You need to be married before using **/hug**.", ephemeral: true });

        marriageSys.update(interaction.guild.id, interaction.user.id, { hugs: (m.hugs || 0) + 1 });
        const lines = ["Certified wholesome moment.", "Emotional support successfully delivered.", "The marriage survives another day.", "A rare peaceful BLVD moment."];
        return interaction.reply({
            embeds: [belovedEmbed("\u{1FAF2} Marriage Hug")
                .setDescription(`<@${interaction.user.id}> hugged <@${m.partner_id}>!\n\n${randomItem(lines)}`)],
            allowedMentions: { users: [m.partner_id] }
        });
    }
};
