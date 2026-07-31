const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { randomItem } = require("../../utils/helpers");

const FATES = [
    "must change their nickname to whatever the server decides for 1 hour",
    "is now the server's designated therapist until someone else gets chosen",
    "has been volunteered for a task they don't know about yet",
    "owes everyone in the voice channel a compliment",
    "must reveal their most embarrassing saved meme",
    "has been chosen by the universe. Good luck.",
    "is legally required to type in all caps for the next 10 messages",
    "must explain their last Google search to the server",
    "is now on trial. Charges pending.",
    "has been selected for random inspection by Beloved's quality assurance team"
];

module.exports = {
    data: new SlashCommandBuilder().setName("wheel").setDescription("Spin the wheel of fate and condemn a random member"),

    async execute(interaction) {
        await interaction.deferReply();
        const members = await interaction.guild.members.fetch();
        const eligible = members.filter(m => !m.user.bot).map(m => m.user);
        if (!eligible.length) return interaction.editReply("The wheel found nobody. This server is a ghost town.");

        const selected = eligible[Math.floor(Math.random() * eligible.length)];
        const fakeSpins = [...eligible].sort(() => Math.random() - 0.5).slice(0, Math.min(6, eligible.length));
        const fate = randomItem(FATES);

        const spinText = fakeSpins.map((u, i) => {
            if (i === fakeSpins.length - 1) return `~~${u.username}~~ ← almost`;
            return `~~${u.username}~~`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "WHEEL OF QUESTIONABLE FATE", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 🎡 The Wheel Has Spoken\n\n**Considered & rejected:**\n${spinText}\n\n## 🎯 THE CHOSEN ONE\n# <@${selected.id}>`)
            .setThumbnail(selected.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "⚖️ Their Fate", value: `> *${selected.username} ${fate}*`, inline: false }
            )
            .setFooter({ text: `Spun by ${interaction.user.username} • The wheel is never wrong. Legally.` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed], allowedMentions: { users: [selected.id] } });
    }
};
