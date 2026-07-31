const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const REASONS = [
    "putting milk in before cereal", "typing 'k' after a five-paragraph message",
    "stealing fries and calling it tax", "having 47 unread notifications",
    "saying 'one more game' at 3 AM", "using light mode at full brightness",
    "laughing before telling the joke", "being emotionally attached to their Wi-Fi router",
    "leaving people on delivered while actively posting memes", "calling every animal a dog",
    "owning a suspicious number of charging cables", "saying 'it is what it is' after causing the problem",
    "being too loud in the group chat", "replying 'who asked' when nobody asked them either",
    "losing an argument to autocorrect", "eating the last snack without announcing it",
    "having a screen time of 14 hours and calling it 'research'",
    "sending voice notes that are basically podcasts", "double texting their own messages",
    "using 😂 unironically in 2025", "ghosting and then watching every story",
    "being suspiciously good at lying in Among Us", "saying 'no offense' before maximum offense"
];

const HASHTAGS = [
    "IsOverParty", "IsCancelled", "Accountability", "NeverTrustedThem",
    "WeKnew", "MainVillain", "CharacterArc", "PublicTrial"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Officially cancel someone for absolutely ridiculous reasons")
        .addUserOption(opt => opt.setName("user").setDescription("Who is getting cancelled?").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reasons = [...REASONS].sort(() => Math.random() - 0.5).slice(0, 3);
        const percentage = Math.floor(Math.random() * 31) + 69;
        const trending = randomItem(HASHTAGS);
        const witnesses = Math.floor(Math.random() * 9999) + 1000;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "⚠️ OFFICIAL CANCELLATION NOTICE ⚠️", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`# 🚫 ${target.username} IS ${percentage}% CANCELLED\n\n**Trending:** #${target.username}${trending}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "📋 Charges Filed", value: reasons.map((r, i) => `**${i + 1}.** ${r}`).join("\n"), inline: false },
                { name: "👥 Witnesses", value: `${witnesses.toLocaleString()} people saw this`, inline: true },
                { name: "⚖️ Verdict", value: "Guilty until proven funny", inline: true },
                { name: "📱 Public Opinion", value: `${"🟥".repeat(Math.floor(percentage / 14))}${"⬜".repeat(7 - Math.floor(percentage / 14))} ${percentage}% cancelled`, inline: false }
            )
            .setFooter({ text: `Filed by ${interaction.user.username} • Appeals accepted via carrier pigeon only` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
    }
};
