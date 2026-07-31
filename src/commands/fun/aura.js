const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

const POSITIVE_EVENTS = [
    { text: "existing without being annoying", points: 500 },
    { text: "never double texting", points: 800 },
    { text: "having a clean notification count", points: 300 },
    { text: "leaving toxic group chats without announcement", points: 1200 },
    { text: "not posting 'first' on anything", points: 600 },
    { text: "knowing when to stop talking", points: 900 },
    { text: "having a fire playlist nobody knows about", points: 700 },
    { text: "winning an argument without raising their voice", points: 1500 },
    { text: "being funny without trying too hard", points: 2000 },
    { text: "having main character energy in silence", points: 1800 },
    { text: "reading the room correctly", points: 400 },
    { text: "not explaining their own jokes", points: 650 }
];

const NEGATIVE_EVENTS = [
    { text: "that profile picture", points: -2000 },
    { text: "typing 'lol' while completely straight-faced", points: -500 },
    { text: "starting sentences with 'no offense but'", points: -1500 },
    { text: "sending 'wyd' at 3 AM", points: -800 },
    { text: "having a screen time over 12 hours", points: -1200 },
    { text: "using the 💀 emoji in every sentence", points: -300 },
    { text: "watching stories without ever reacting", points: -900 },
    { text: "sending voice notes over 60 seconds", points: -1100 },
    { text: "replying 'K' to a paragraph", points: -3000 },
    { text: "unironically saying 'it's giving'", points: -700 },
    { text: "leaving someone on opened", points: -1400 },
    { text: "googling 'what is aura' after seeing this", points: -5000 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aura")
        .setDescription("Check someone's aura points with extreme prejudice")
        .addUserOption(opt => opt.setName("user").setDescription("Subject of the aura scan").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");

        // Pick 2-3 positive and 2-3 negative events
        const posCount = Math.floor(Math.random() * 2) + 2;
        const negCount = Math.floor(Math.random() * 2) + 2;
        const positives = [...POSITIVE_EVENTS].sort(() => Math.random() - 0.5).slice(0, posCount);
        const negatives = [...NEGATIVE_EVENTS].sort(() => Math.random() - 0.5).slice(0, negCount);

        const totalPositive = positives.reduce((sum, e) => sum + e.points, 0);
        const totalNegative = negatives.reduce((sum, e) => sum + e.points, 0);
        const netAura = totalPositive + totalNegative;

        const breakdown = [
            ...positives.map(e => `\`+${e.points.toLocaleString()}\` ${e.text}`),
            ...negatives.map(e => `\`${e.points.toLocaleString()}\` ${e.text}`)
        ].join("\n");

        let verdict, color, emoji;
        if (netAura > 3000) { verdict = "LEGENDARY AURA. Untouchable."; color = 0xFFD700; emoji = "👑"; }
        else if (netAura > 1500) { verdict = "Strong aura. Respected in most group chats."; color = BELOVED_PINK; emoji = "✨"; }
        else if (netAura > 0) { verdict = "Mid aura. Room for improvement."; color = 0x90EE90; emoji = "😐"; }
        else if (netAura > -1500) { verdict = "Negative aura detected. Consider a rebrand."; color = 0xFFA500; emoji = "📉"; }
        else if (netAura > -3000) { verdict = "Critically low aura. Touch grass immediately."; color = 0xFF4500; emoji = "💀"; }
        else { verdict = "AURA BANKRUPTCY. This cannot be recovered from."; color = 0x000000; emoji = "☠️"; }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: "BELOVED AURA SCANNER™", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## ${emoji} Aura Analysis: ${target.username}\n\n**Net Aura: ${netAura >= 0 ? "+" : ""}${netAura.toLocaleString()} points**\n\n${breakdown}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "📊 Verdict", value: `> *${verdict}*`, inline: false },
                { name: "📈 Gains", value: `+${totalPositive.toLocaleString()}`, inline: true },
                { name: "📉 Losses", value: `${totalNegative.toLocaleString()}`, inline: true },
                { name: "🎯 Net Total", value: `**${netAura >= 0 ? "+" : ""}${netAura.toLocaleString()}**`, inline: true }
            )
            .setFooter({ text: `Scanned by ${interaction.user.username} • Aura readings are final and non-negotiable` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
