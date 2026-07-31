const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

const ROASTS = [
    { text: "has the confidence of someone who skips tutorials and then asks for help in general chat.", severity: "Moderate" },
    { text: "'s brain is running on **free trial mode** and the 7 days expired in 2019.", severity: "Severe" },
    { text: "probably says \"trust me\" right before every disaster in their life.", severity: "Critical" },
    { text: "was checked by Beloved. The results were **immediately classified.**", severity: "Redacted" },
    { text: "has the social awareness of a push notification nobody asked for.", severity: "Brutal" },
    { text: "types like their keyboard is running away from them.", severity: "Moderate" },
    { text: "peaked in a group chat and has been coasting on that energy since.", severity: "Terminal" },
    { text: "'s vibe is 'reply guy who never gets a reply back.'", severity: "Devastating" },
    { text: "is the human equivalent of a YouTube ad you can't skip.", severity: "Lethal" },
    { text: "has an energy that makes WiFi disconnect out of respect for itself.", severity: "Nuclear" }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Roast someone into the shadow realm")
        .addUserOption(opt => opt.setName("user").setDescription("The victim").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const roast = randomItem(ROASTS);
        const damage = Math.floor(Math.random() * 9001) + 1000;

        const embed = new EmbedBuilder()
            .setColor(0xFF4500)
            .setAuthor({ name: "BELOVED ROAST DEPARTMENT", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 🔥 Incident Report\n\n**Victim:** <@${user.id}>\n\n> ${user.username} ${roast.text}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "💀 Damage Dealt", value: `**${damage.toLocaleString()}** emotional HP`, inline: true },
                { name: "⚠️ Severity", value: `**${roast.severity}**`, inline: true },
                { name: "🏥 Recovery Time", value: `${Math.floor(Math.random() * 30) + 1} business days`, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.username} • No refunds on emotional damage` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
