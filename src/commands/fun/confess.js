const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("confess")
        .setDescription("Submit an anonymous confession — Beloved posts it with no name attached"),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId("confess_modal")
            .setTitle("Anonymous Confession");

        const confessionInput = new TextInputBuilder()
            .setCustomId("confession_text")
            .setLabel("Your confession (stays anonymous)")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("I secretly think that...")
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(confessionInput));
        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        const text = interaction.fields.getTextInputValue("confession_text");
        const confessionNum = Math.floor(Math.random() * 99999) + 1;

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "ANONYMOUS CONFESSION", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 🤫 Confession #${confessionNum}\n\n>>> ${text}`)
            .addFields(
                { name: "🕵️ Identity", value: "**[REDACTED]**", inline: true },
                { name: "📅 Submitted", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: "🔒 Anonymity", value: "Guaranteed by Beloved", inline: true }
            )
            .setFooter({ text: "Use /confess to submit your own • Beloved never reveals identities" })
            .setTimestamp();

        // Send the confession publicly, reply to the user ephemerally
        await interaction.reply({ content: "✅ Your confession has been posted anonymously.", ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
    }
};
