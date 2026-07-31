const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

function ratingBar(val) {
    const filled = Math.floor(val / 10);
    return `${"▓".repeat(filled)}${"░".repeat(10 - filled)} ${val}%`;
}

const TITLES = [
    "Specimen Analysis", "Human Performance Review", "Vibe Audit Results",
    "Annual Character Assessment", "Quality Control Report"
];

const BONUS_STATS = [
    "Unhinged Energy", "Yap Velocity", "Menace Factor", "Delusion Level",
    "Main Character Syndrome", "NPC Behaviour", "Villain Arc Potential",
    "Chronically Online Index", "Emotional Damage Output", "Trust Issues Rating"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rate")
        .setDescription("Get a full Beloved rating breakdown of someone")
        .addUserOption(opt => opt.setName("user").setDescription("Subject of analysis").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const coolness = Math.floor(Math.random() * 101);
        const chaos = Math.floor(Math.random() * 101);
        const approval = Math.floor(Math.random() * 101);
        const bonus = randomItem(BONUS_STATS);
        const bonusVal = Math.floor(Math.random() * 101);
        const overall = Math.floor((coolness + chaos + approval + bonusVal) / 4);
        const grade = overall > 90 ? "S+" : overall > 75 ? "A" : overall > 60 ? "B+" : overall > 45 ? "C" : overall > 25 ? "D" : "F";

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: randomItem(TITLES), iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 📊 Rating: ${user.username}\n\n**Overall Grade: ${grade}** (${overall}/100)`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "😎 Coolness", value: ratingBar(coolness), inline: false },
                { name: "🔥 Chaos", value: ratingBar(chaos), inline: false },
                { name: "💖 Beloved Approval", value: ratingBar(approval), inline: false },
                { name: `🎲 ${bonus}`, value: ratingBar(bonusVal), inline: false }
            )
            .setFooter({ text: `Rated by Beloved • Complaints can be submitted to /dev/null` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
