const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const CONVO_TEMPLATES = [
    [
        { side: "target", text: "bro can you keep a secret" },
        { side: "other", text: "yeah ofc whats up" },
        { side: "target", text: "i {secret}" },
        { side: "other", text: "WHAT" },
        { side: "target", text: "dont tell anyone please" },
        { side: "other", text: "bro..." }
    ],
    [
        { side: "target", text: "ok hear me out" },
        { side: "other", text: "im listening" },
        { side: "target", text: "i think {opinion}" },
        { side: "other", text: "are you okay ???" },
        { side: "target", text: "IM SERIOUS" },
        { side: "other", text: "im screenshotting this" }
    ],
    [
        { side: "other", text: "why did you {action} yesterday" },
        { side: "target", text: "WHO TOLD YOU" },
        { side: "other", text: "everyone saw it 💀" },
        { side: "target", text: "i can explain" },
        { side: "other", text: "please do" },
        { side: "target", text: "actually no i cant" }
    ],
    [
        { side: "target", text: "dont judge me but" },
        { side: "other", text: "already judging go on" },
        { side: "target", text: "i lowkey {confession}" },
        { side: "other", text: "i am SPEECHLESS" },
        { side: "target", text: "its not that deep" },
        { side: "other", text: "it is ASTRONOMICALLY that deep" }
    ],
    [
        { side: "target", text: "yo" },
        { side: "other", text: "what" },
        { side: "target", text: "you know how i said i {claim}?" },
        { side: "other", text: "yeah?" },
        { side: "target", text: "i lied" },
        { side: "other", text: "BRO I TOLD EVERYONE 😭" }
    ]
];

const SECRETS = [
    "still sleep with a nightlight on", "have never actually watched the shows i recommend",
    "ate someone's clearly labeled lunch from the fridge", "google basic words to check the spelling",
    "have 14 alarms set every morning and still wake up late", "pretend to understand crypto",
    "have a secret playlist that would end my reputation", "practice arguments in the shower",
    "stalk my own social media from a second account", "laughed at a meme i didnt understand"
];

const OPINIONS = [
    "pineapple on pizza is actually elite", "water is overrated as a drink",
    "cereal is technically a soup", "the floor is the best place to sit",
    "sleeping with socks on is normal behaviour", "mondays are better than fridays",
    "screen time limits are for the weak", "the movie was better than the book"
];

const ACTIONS = [
    "like your own post from an alt", "google 'how to be cool' at 2am",
    "cry at that dog video in the group chat", "rehearse a text for 40 minutes",
    "have a full argument with nobody in the shower", "try to unlock your phone with your face while yawning"
];

const CONFESSIONS = [
    "think about my Discord messages after i send them for hours",
    "rehearse voice notes before recording them", "have screenshots saved from 2019 arguments just in case",
    "google my own username to see what comes up", "delete and retype texts to sound more unbothered",
    "stare at the 'typing...' indicator like it owes me money"
];

const CLAIMS = [
    "dont care about follower counts", "never check who viewed my story",
    "dont get jealous", "am really good at cooking", "go to bed early",
    "dont overthink things", "am not competitive"
];

function fillTemplate(template) {
    let text = template;
    text = text.replace("{secret}", randomItem(SECRETS));
    text = text.replace("{opinion}", randomItem(OPINIONS));
    text = text.replace("{action}", randomItem(ACTIONS));
    text = text.replace("{confession}", randomItem(CONFESSIONS));
    text = text.replace("{claim}", randomItem(CLAIMS));
    return text;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("expose")
        .setDescription("Leak someone's totally real and legitimate DMs")
        .addUserOption(opt => opt.setName("user").setDescription("Who is getting exposed?").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");

        // Pick a random non-bot member as the other person
        await interaction.deferReply();
        const members = await interaction.guild.members.fetch();
        const eligible = members.filter(m => !m.user.bot && m.id !== target.id && m.id !== interaction.user.id).map(m => m.user);
        const other = eligible.length ? randomItem([...eligible]) : interaction.user;

        const template = randomItem(CONVO_TEMPLATES);
        const convo = template.map(msg => {
            const sender = msg.side === "target" ? target : other;
            const content = fillTemplate(msg.text);
            return `**${sender.username}:** ${content}`;
        }).join("\n");

        const leakDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
        const dateStr = leakDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "⚠️ LEAKED DMS ⚠️", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 📱 Intercepted Messages\n\n**Between:** <@${target.id}> and <@${other.id}>\n**Date:** ${dateStr}\n**Classification:** Top Secret\n\n───────────────────────\n${convo}\n───────────────────────`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🔓 Leaked by", value: `<@${interaction.user.id}>`, inline: true },
                { name: "👁️ Views", value: `${Math.floor(Math.random() * 50000) + 5000}`, inline: true },
                { name: "📋 Authenticity", value: "100% verified (source: trust me)", inline: true }
            )
            .setFooter({ text: "DISCLAIMER: This DM is completely fabricated by Beloved for entertainment purposes" })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
};
