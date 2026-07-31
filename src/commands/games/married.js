const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const marriageSys = require("../../systems/marriage");

module.exports = {
    data: new SlashCommandBuilder().setName("married").setDescription("See who you are married to"),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You are not married to anyone.", ephemeral: true });

        const ringText = m.ring_name ? `${m.ring_emoji} **${m.ring_name}**` : "No ring yet \u2014 use **/ring buy**";
        return interaction.reply({
            embeds: [belovedEmbed("\u{1F48D} Your Marriage")
                .setDescription(`<@${interaction.user.id}> is married to <@${m.partner_id}>.\n\n**Wedding date:** <t:${Math.floor(m.married_at / 1000)}:F>\n**Together:** <t:${Math.floor(m.married_at / 1000)}:R>\n**Ring:** ${ringText}`)
                .addFields(
                    { name: "\u{1F48B} Kisses", value: String(m.kisses || 0), inline: true },
                    { name: "\u{1FAF2} Hugs", value: String(m.hugs || 0), inline: true },
                    { name: "\u{1F339} Dates", value: String(m.dates || 0), inline: true },
                    { name: "\u{1F381} Gifts", value: String(m.gifts || 0), inline: true }
                )],
            allowedMentions: { parse: [] }
        });
    }
};
