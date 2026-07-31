const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const marriageSys = require("../../systems/marriage");

module.exports = {
    data: new SlashCommandBuilder().setName("divorce").setDescription("Divorce your current spouse"),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You are not married to anyone.", ephemeral: true });

        marriageSys.remove(interaction.guild.id, interaction.user.id);
        return interaction.reply({
            embeds: [belovedEmbed("\u{1F494} Divorce Finalised")
                .setDescription(`<@${interaction.user.id}> has divorced <@${m.partner_id}>.\n\nThe lawyers were Discord moderators and the settlement was zero coins.`)],
            allowedMentions: { users: [interaction.user.id, m.partner_id] }
        });
    }
};
