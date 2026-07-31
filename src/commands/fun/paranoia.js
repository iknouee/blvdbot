const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { randomItem, coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const QUESTIONS = [
    "who in this server gives you the most second-hand embarrassment?",
    "who would be the first to get eliminated in a horror movie?",
    "who has the worst takes in this server?",
    "who would you trust LEAST with a secret?",
    "who is the most chronically online person here?",
    "who do you think has a secret alt account?",
    "who would you NOT want as your partner in a group project?",
    "whose messages do you sometimes scroll past?",
    "who gives 'peaked in middle school' energy?",
    "who would accidentally reveal classified information?",
    "who would be the worst roommate?",
    "who talks the most but says the least?",
    "who do you think secretly googles things everyone else already knows?",
    "who gives 'main character but the movie flopped' energy?",
    "who would survive the least amount of time without Wi-Fi?",
    "who would you LEAST want to be stuck in an elevator with?",
    "who is probably lying about their music taste?",
    "who has definitely googled their own username?"
];

const REVEAL_COST = 200;
const activeParanoiaGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("paranoia")
        .setDescription("Ask someone a paranoia question — the server only sees the answer"),

    activeParanoiaGames,

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "This only works in servers.", ephemeral: true });

        // Pick a random member to answer
        await interaction.deferReply();
        const members = await interaction.guild.members.fetch();
        const eligible = members.filter(m => !m.user.bot && m.id !== interaction.user.id).map(m => m);
        if (eligible.length < 2) return interaction.editReply("Not enough people in this server for paranoia.");

        const answerer = randomItem([...eligible]);
        const question = randomItem(QUESTIONS);

        const gameId = interaction.id;
        activeParanoiaGames.set(gameId, { question, guildId: interaction.guild.id, channelId: interaction.channel.id });

        // DM the question to the answerer
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(BELOVED_PINK)
                .setDescription(`## 🧠 Paranoia Question\n\n**From:** ${interaction.guild.name}\n**Question:** ${question}\n\n**Reply in the channel** with someone's name/ping. The server will see your answer but NOT the question unless someone pays ${REVEAL_COST} coins.`)
                .setFooter({ text: "Just type their name or @ them in the channel" });

            await answerer.send({ embeds: [dmEmbed] });
        } catch (e) {
            return interaction.editReply("❌ I couldn't DM the chosen person. They might have DMs closed.");
        }

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "PARANOIA", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 🧠 A Question Has Been Whispered\n\n<@${answerer.id}> has been sent a **secret question** about someone in this server.\n\nThey will reply with a name. You will NOT know what the question was.\n\n*Unless someone pays **${REVEAL_COST} coins** to reveal it...*`)
            .addFields(
                { name: "🎯 Answering", value: `<@${answerer.id}>`, inline: true },
                { name: "❓ Question", value: "**[HIDDEN]**", inline: true },
                { name: "💰 Reveal Cost", value: `${coins(REVEAL_COST)}`, inline: true }
            )
            .setFooter({ text: `Started by ${interaction.user.username} • Use the button below to reveal` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`paranoia:reveal:${gameId}`)
                .setLabel(`Reveal Question (${REVEAL_COST} coins)`)
                .setEmoji("🔓")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });

        // Auto-expire after 5 minutes
        setTimeout(() => { activeParanoiaGames.delete(gameId); }, 5 * 60 * 1000);
    },

    async handleButton(interaction, action, gameId) {
        const game = activeParanoiaGames.get(gameId);
        if (!game) return interaction.reply({ content: "This paranoia round has expired.", ephemeral: true });

        if (action === "reveal") {
            const account = economy.getUser(interaction.guild.id, interaction.user.id);
            if (account.balance < REVEAL_COST) {
                return interaction.reply({ content: `You need **${coins(REVEAL_COST)}** to reveal the question. You have ${coins(account.balance)}.`, ephemeral: true });
            }

            economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - REVEAL_COST });
            activeParanoiaGames.delete(gameId);

            const revealEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setDescription(`## 🔓 QUESTION REVEALED\n\n<@${interaction.user.id}> paid **${coins(REVEAL_COST)}** to expose the question:\n\n> **"${game.question}"**`)
                .setFooter({ text: "The truth costs money in this economy" })
                .setTimestamp();

            await interaction.update({ components: [] });
            return interaction.followUp({ embeds: [revealEmbed] });
        }
    }
};
