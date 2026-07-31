const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const CHARGES = [
    "Illegal possession of too many Discord notifications",
    "First-degree yapping without a permit",
    "Grand theft of someone's fries and calling it 'sharing'",
    "Operating a group chat under the influence of sleep deprivation",
    "Aggravated lurking in voice channels without speaking",
    "Identity fraud (being a completely different person in DMs)",
    "Reckless endangerment of the group chat's sanity",
    "Possession of an unreasonable number of unread messages",
    "Tax evasion on borrowed Netflix accounts",
    "Disturbing the peace with unsolicited voice notes",
    "Conspiracy to screenshot without permission",
    "Public indecency (that profile picture)",
    "Failure to appear (left people on read for 3 days)",
    "Harassment of the skip button on every ad",
    "Armed robbery of everyone's time with bad takes",
    "Obstruction of justice (deleting messages before anyone saw them)",
    "Money laundering through Discord Nitro gifting",
    "Witness intimidation via passive-aggressive emoji reactions",
    "Breaking and entering the conversation uninvited",
    "Cyberstalking (watching stories without ever following back)"
];

const ALIASES = [
    "The Lurker", "Silent But Deadly", "The Yapper", "Ghost Reader",
    "Double Texter", "The Emoji Spammer", "Reply Guy", "Notification Terrorist",
    "The Screenshot Collector", "Voice Note Villain", "Alt Account Andy",
    "Story Stalker", "The Chronically Online", "DM Slider"
];

const STATUSES = ["WANTED", "CAPTURED", "AT LARGE", "UNDER INVESTIGATION", "ON THE RUN"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mugshot")
        .setDescription("Generate someone's criminal record")
        .addUserOption(opt => opt.setName("user").setDescription("The suspect").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const charges = [...CHARGES].sort(() => Math.random() - 0.5).slice(0, 3);
        const alias = randomItem(ALIASES);
        const status = randomItem(STATUSES);
        const caseNum = `BLV-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`;
        const bail = Math.floor(Math.random() * 999000) + 1000;
        const priors = Math.floor(Math.random() * 47) + 1;
        const dangerLevel = Math.floor(Math.random() * 5) + 1;

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setAuthor({ name: `🚨 ${status} — BELOVED POLICE DEPARTMENT`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`# CRIMINAL RECORD\n## ${target.username}\n\n**Alias:** "${alias}"\n**Case #:** ${caseNum}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "⚖️ Charges", value: charges.map((c, i) => `**${i + 1}.** ${c}`).join("\n"), inline: false },
                { name: "🔒 Bail Amount", value: `$${bail.toLocaleString()}`, inline: true },
                { name: "📁 Prior Offences", value: `**${priors}**`, inline: true },
                { name: "⚠️ Danger Level", value: `${"🔴".repeat(dangerLevel)}${"⚫".repeat(5 - dangerLevel)}`, inline: true },
                { name: "📍 Last Seen", value: `<#${interaction.channel.id}>`, inline: true },
                { name: "🕐 Time of Arrest", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: "👮 Arresting Officer", value: `<@${interaction.user.id}>`, inline: true }
            )
            .setFooter({ text: "Beloved PD • Do not approach — suspect may be armed with bad opinions" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
    }
};
