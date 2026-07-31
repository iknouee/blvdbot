const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { randomItem } = require("../../utils/helpers");
const marriageSys = require("../../systems/marriage");

module.exports = {
    data: new SlashCommandBuilder().setName("kiss").setDescription("Kiss your spouse"),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You need to be married before using **/kiss**.", ephemeral: true });

        marriageSys.update(interaction.guild.id, interaction.user.id, { kisses: (m.kisses || 0) + 1 });
        const lines = ["That was suspiciously romantic.", "The whole server just third-wheeled that.", "Beloved has recorded the evidence.", "Get a room. Respectfully."];
        return interaction.reply({
            embeds: [belovedEmbed("\u{1F48B} Marriage Kiss")
                .setDescription(`<@${interaction.user.id}> kissed <@${m.partner_id}>!\n\n${randomItem(lines)}`)],
            allowedMentions: { users: [m.partner_id] }
        });
    }
};
