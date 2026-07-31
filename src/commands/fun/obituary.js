const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const CAUSES = [
    "Died doing what they loved: losing arguments in general chat.",
    "Fatally roasted. No survivors. The burn ward was full.",
    "Passed away after reading a message so bad their soul left their body.",
    "Killed by secondhand embarrassment from their own voice note.",
    "Heart stopped after someone replied 'K' to their paragraph.",
    "Didn't survive the ratio. It was 47-3.",
    "Tragically fell off after posting their worst take yet.",
    "Found unresponsive after their crush left them on read for 72 hours.",
    "Eliminated in Red Light, Green Light. (Not the game. They jaywalked.)",
    "Cause of death: tried to be funny in a group chat and nobody reacted.",
    "Flatlined after checking their screen time report.",
    "Death by cringe after someone screenshotted their 2019 messages."
];

const QUOTES = [
    "They really thought they could win that argument.",
    "In their defense, nobody warned them about the ratio.",
    "Gone but not forgotten. Unfortunately.",
    "They lived fast and typed faster. Neither ended well.",
    "Rest in peace. The group chat will be quieter now.",
    "Their last words were 'watch this' — never a good sign."
];

const LEGACIES = [
    "A half-finished Spotify playlist nobody asked for",
    "14,000 unread Discord notifications",
    "A Notes app draft that will never see the light of day",
    "A Snapchat streak that dies with them",
    "Three alt accounts and a suspicious search history",
    "A 'be right back' message from 2023 that was never followed up on"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("obituary")
        .setDescription("Write someone's totally premature obituary")
        .addUserOption(opt => opt.setName("user").setDescription("The 'deceased'").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const cause = randomItem(CAUSES);
        const quote = randomItem(QUOTES);
        const legacy = randomItem(LEGACIES);
        const age = Math.floor(Math.random() * 80) + 16;
        const flowers = Math.floor(Math.random() * 999) + 1;

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setAuthor({ name: "IN MEMORIAM", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`# 🪦 ${target.username}\n## ${age} years old — gone too soon\n\n> *"${quote}"*\n\n**Cause of Death:**\n${cause}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🏛️ Legacy Left Behind", value: legacy, inline: false },
                { name: "💐 Flowers Received", value: `${flowers}`, inline: true },
                { name: "😢 Mourners", value: `${Math.floor(Math.random() * 3) + 1} (and that's generous)`, inline: true },
                { name: "⚰️ Funeral Location", value: `<#${interaction.channel.id}>`, inline: true }
            )
            .setFooter({ text: `Eulogy written by ${interaction.user.username} • Press F to pay respects` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
    }
};
