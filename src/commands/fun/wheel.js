const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("wheel").setDescription("Spin the wheel and select a random server member"),

    async execute(interaction) {
        await interaction.deferReply();
        const members = await interaction.guild.members.fetch();
        const eligible = members.filter(m => !m.user.bot).map(m => m.user);
        if (!eligible.length) return interaction.editReply("\u{1F62D} The wheel found nobody.");

        const selected = eligible[Math.floor(Math.random() * eligible.length)];
        const fakeSpins = [...eligible].sort(() => Math.random() - 0.5).slice(0, Math.min(5, eligible.length));

        const embed = new EmbedBuilder()
            .setTitle("\u{1F3A1} Beloved's Wheel of Questionable Fate")
            .setDescription(`The wheel considered...\n${fakeSpins.map(u => `\u2022 ${u}`).join("\n")}\n\n\u{1F389} **The chosen one is ${selected}!**`)
            .setThumbnail(selected.displayAvatarURL({ size: 256 }))
            .setFooter({ text: "The wheel is never wrong. Legally." })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed], allowedMentions: { users: [selected.id] } });
    }
};
