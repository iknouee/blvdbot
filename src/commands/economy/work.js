const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins, formatCooldown, randomItem } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const JOBS = [
    { title: "Professional Third Wheel", desc: "You followed a couple around IKEA holding their bags. They didn't invite you.", emoji: "🛒" },
    { title: "Toaster Quality Tester", desc: "Three toasters exploded. One worked. You got paid for surviving.", emoji: "🍞" },
    { title: "Yap Olympics Moderator", desc: "You refereed a yapping contest. Both parties were disqualified for breathing.", emoji: "🗣️" },
    { title: "Premium Air Salesman", desc: "You sold 4 jars of 'mountain breeze' to tourists. It was just air from the parking lot.", emoji: "💨" },
    { title: "Casino Bathroom Guard", desc: "Nobody tried to enter. You still count it as a successful shift.", emoji: "🚽" },
    { title: "Discord Notification Counter", desc: "You counted 847,291 pings across all servers. Most of them were @everyone.", emoji: "🔔" },
    { title: "Pixel Counter", desc: "Beloved hired you to count their pixels. You lost count at 12.", emoji: "🖥️" },
    { title: "Professional Lurker", desc: "You lurked in 17 voice channels without speaking. This is apparently a job now.", emoji: "👁️" },
    { title: "Meme Archivist", desc: "You catalogued 200 memes. 198 of them were reposts.", emoji: "📁" },
    { title: "Vibe Checker", desc: "You checked 43 vibes. 41 were immaculate. 2 were concerning.", emoji: "✅" }
];

module.exports = {
    data: new SlashCommandBuilder().setName("work").setDescription("Work a questionable job for questionable coins"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 30 * 60 * 1000;
        const left = account.last_work + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`## 🕐 On Break\n\nYour next shift starts in **${formatCooldown(left)}**.\n\nLabour laws exist for a reason. Allegedly.`)
                    .setFooter({ text: "HR will not be hearing about this" })
                    .setTimestamp()],
                ephemeral: true
            });
        }

        const job = randomItem(JOBS);
        const reward = Math.floor(Math.random() * 351) + 250;
        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_work: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "SHIFT COMPLETE", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## ${job.emoji} ${job.title}\n\n> *${job.desc}*`)
            .addFields(
                { name: "💵 Pay Cheque", value: `**+${coins(reward)}**`, inline: true },
                { name: "💰 Balance", value: `**${coins(account.balance + reward)}**`, inline: true },
                { name: "⏰ Next Shift", value: "<t:" + Math.floor((Date.now() + cooldown) / 1000) + ":R>", inline: true }
            )
            .setFooter({ text: `${interaction.user.username} • Employee of the month (by default)` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
