const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

const LOVE_RESPONSES = [
    { text: "has been blessed by Beloved. Use this power wisely.", emoji: "💖", footer: "Certified lovable by Beloved Inc." },
    { text: "has been scanned. Result: **dangerously lovable.**", emoji: "💕", footer: "Warning: May cause jealousy in nearby users." },
    { text: "has unlocked **premium friendship mode.**", emoji: "🌹", footer: "Subscription renews never. You're welcome." },
    { text: "is now **12% more amazing** than before.", emoji: "✨", footer: "The other 88% was already perfect." },
    { text: "has received a **love injection** directly into the timeline.", emoji: "💉💖", footer: "Side effects include serotonin and compliments." },
    { text: "just got upgraded to **Beloved VIP status.**", emoji: "👑", footer: "Access includes: being adored unconditionally." },
    { text: "has been added to Beloved's **protected species list.**", emoji: "🛡️💗", footer: "Harassment of this individual is now a federal offence." }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("love")
        .setDescription("Give someone Beloved's love")
        .addUserOption(opt => opt.setName("user").setDescription("Person to bless").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const response = randomItem(LOVE_RESPONSES);
        const lovePercent = Math.floor(Math.random() * 31) + 70;

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "Beloved Love Department", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## ${response.emoji} Love Delivered\n\n<@${user.id}> ${response.text}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "💗 Love Level", value: `${"█".repeat(Math.floor(lovePercent / 10))}${"░".repeat(10 - Math.floor(lovePercent / 10))} **${lovePercent}%**`, inline: false },
                { name: "📬 Sent by", value: `<@${interaction.user.id}>`, inline: true },
                { name: "📋 Status", value: "Delivered ✓✓", inline: true }
            )
            .setFooter({ text: response.footer })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
