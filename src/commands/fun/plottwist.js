const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const TWISTS = [
    { headline: "SECRET IDENTITY REVEALED", body: "{one} was {two}'s alt account this ENTIRE TIME. Everything you thought you knew was a lie." },
    { headline: "FORBIDDEN ALLIANCE EXPOSED", body: "{one} and {two} have been running a secret group chat where they talk about everyone else in this server." },
    { headline: "TIME TRAVEL CONFIRMED", body: "{one} is actually {two} from the future, sent back to prevent a catastrophic meme shortage." },
    { headline: "WITNESS PROTECTION BREACH", body: "{one} has been placed in witness protection after testifying against {two} in Beloved Court." },
    { headline: "CLONE THEORY CONFIRMED", body: "Scientists have confirmed that {one} and {two} are the same person. The typing styles match. The vibes match. It's over." },
    { headline: "DOUBLE AGENT DETECTED", body: "{one} has been secretly feeding {two}'s messages to a rival server this whole time." },
    { headline: "ARRANGED RIVALRY", body: "The beef between {one} and {two} was SCRIPTED. They've been best friends since 2019. Receipts are emerging." },
    { headline: "DEEP STATE CONSPIRACY", body: "{one} and {two} are both controlled by the same person using two keyboards. The typing speed gives it away." },
    { headline: "PROPHECY FULFILLED", body: "Ancient Discord lore predicted that {one} and {two} would join forces to destroy this server. The prophecy is coming true." },
    { headline: "SIMULATION GLITCH", body: "{one} and {two} sent the exact same message in different servers at the exact same millisecond. The simulation is breaking." },
    { headline: "INHERITANCE DRAMA", body: "{two} just discovered that {one} was secretly written into their grandmother's will. Nobody knows why." },
    { headline: "CONTRACTUAL OBLIGATION", body: "{one} is legally required to agree with everything {two} says, per a binding agreement signed at 2 AM." }
];

const SOURCES = [
    "Anonymous tip via carrier pigeon",
    "Leaked internal memo from Beloved HQ",
    "Declassified server logs (FOIA request)",
    "Whistleblower in the admin team",
    "AI-enhanced screenshot forensics",
    "Beloved Intelligence Agency (BIA)"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("plottwist")
        .setDescription("Reveal a shocking plot twist between two server members")
        .addUserOption(opt => opt.setName("one").setDescription("First person involved").setRequired(true))
        .addUserOption(opt => opt.setName("two").setDescription("Second person involved").setRequired(true)),

    async execute(interaction) {
        const one = interaction.options.getUser("one");
        const two = interaction.options.getUser("two");
        const twist = randomItem(TWISTS);
        const source = randomItem(SOURCES);
        const body = twist.body.replace(/\{one\}/g, `**${one.username}**`).replace(/\{two\}/g, `**${two.username}**`);
        const credibility = Math.floor(Math.random() * 60) + 40;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "🚨 BREAKING NEWS 🚨", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`# 🎬 ${twist.headline}\n\n${body}`)
            .addFields(
                { name: "👤 Subjects", value: `<@${one.id}> and <@${two.id}>`, inline: true },
                { name: "📰 Source", value: source, inline: true },
                { name: "📊 Credibility", value: `${credibility}% (trust us)`, inline: true }
            )
            .setFooter({ text: `Plot twist revealed by ${interaction.user.username} • Beloved News Network` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
};
