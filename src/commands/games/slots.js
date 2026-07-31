const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, clampBet } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const SLOT_SYMBOLS = [
    { emoji: "\u{1F352}", weight: 28, mult: 3 },
    { emoji: "\u{1F34B}", weight: 24, mult: 4 },
    { emoji: "\u{1F347}", weight: 19, mult: 5 },
    { emoji: "\u{1F514}", weight: 14, mult: 8 },
    { emoji: "\u{1F48E}", weight: 9, mult: 12 },
    { emoji: "7\uFE0F\u20E3", weight: 5, mult: 20 },
    { emoji: "\u{1F451}", weight: 1, mult: 50 }
];

function weightedSlotSymbol() {
    const total = SLOT_SYMBOLS.reduce((a, s) => a + s.weight, 0);
    let roll = Math.random() * total;
    for (const sym of SLOT_SYMBOLS) { roll -= sym.weight; if (roll <= 0) return sym; }
    return SLOT_SYMBOLS[0];
}

function slotGrid(finalRow = null) {
    const rows = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => weightedSlotSymbol()));
    if (finalRow) rows[1] = finalRow;
    return rows;
}

function renderSlotReels(grid, status = "SPINNING") {
    const rows = grid.map(row => row.map(item => item.emoji));
    return [
        "```",
        "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
        `\u2502  ${rows[0][0]}  \u2502  ${rows[0][1]}  \u2502  ${rows[0][2]}  \u2502`,
        `\u2502  ${rows[1][0]}  \u2502  ${rows[1][1]}  \u2502  ${rows[1][2]}  \u2502  \u25C0`,
        `\u2502  ${rows[2][0]}  \u2502  ${rows[2][1]}  \u2502  ${rows[2][2]}  \u2502`,
        "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
        `\u2502     ${status.padStart(5).padEnd(9)}     \u2502`,
        "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
        "```"
    ].join("\n");
}

function evaluateSlots(row, bet) {
    const [a, b, c] = row;
    if (a.emoji === b.emoji && b.emoji === c.emoji) return { payout: bet * a.mult, label: a.emoji === "\u{1F451}" ? "ROYAL JACKPOT" : "THREE OF A KIND" };
    if (a.emoji === b.emoji || b.emoji === c.emoji || a.emoji === c.emoji) return { payout: Math.floor(bet * 1.5), label: "PAIR WIN" };
    if (row.some(x => x.emoji === "7\uFE0F\u20E3") && row.some(x => x.emoji === "\u{1F48E}")) return { payout: bet * 2, label: "LUCKY COMBO" };
    return { payout: 0, label: "HOUSE WINS" };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slots")
        .setDescription("Spin Beloved's animated slot machine")
        .addIntegerOption(opt => opt.setName("bet").setDescription("Bet 10 or more coins").setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const bet = interaction.options.getInteger("bet");
        const account = economy.getUser(interaction.guild.id, interaction.user.id);

        if (!clampBet(account.balance, bet)) {
            return interaction.reply({ content: `Bet must be at least 10 and no more than your ${coins(account.balance)} balance.`, ephemeral: true });
        }

        if (!economy.acquireLock(interaction.guild.id, interaction.user.id)) {
            return interaction.reply({ content: "\u{1F3B0} Your previous spin is still moving.", ephemeral: true });
        }

        economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - bet });
        const finalRow = [weightedSlotSymbol(), weightedSlotSymbol(), weightedSlotSymbol()];

        try {
            let animatedGrid = slotGrid();
            await interaction.reply({
                embeds: [belovedEmbed("\u{1F3B0} Slot Machine")
                    .setDescription(renderSlotReels(animatedGrid, "SPINNING"))
                    .addFields(
                        { name: "Bet", value: coins(bet), inline: true },
                        { name: "Balance", value: coins(account.balance - bet), inline: true }
                    )
                    .setFooter({ text: `${interaction.user.username} \u2022 reels spinning` })]
            });

            for (let frame = 0; frame < 8; frame++) {
                await new Promise(r => setTimeout(r, 350));
                animatedGrid = slotGrid();
                if (frame >= 5) animatedGrid[1][0] = finalRow[0];
                if (frame >= 6) animatedGrid[1][1] = finalRow[1];
                if (frame >= 7) animatedGrid[1][2] = finalRow[2];

                await interaction.editReply({
                    embeds: [belovedEmbed("\u{1F3B0} Slot Machine")
                        .setDescription(renderSlotReels(animatedGrid, frame === 7 ? "LOCKED" : "SPINNING"))
                        .addFields(
                            { name: "Bet", value: coins(bet), inline: true },
                            { name: "Balance", value: coins(account.balance - bet), inline: true }
                        )
                        .setFooter({ text: `${interaction.user.username} \u2022 ${frame === 7 ? "reels locked" : "reels spinning"}` })]
                });
            }

            const finalGrid = slotGrid(finalRow);
            const result = evaluateSlots(finalRow, bet);
            const newBalance = account.balance - bet + result.payout;

            const updates = { balance: newBalance };
            if (result.payout > bet) updates.total_won = account.total_won + (result.payout - bet);
            else updates.total_lost = account.total_lost + (bet - result.payout);
            economy.update(interaction.guild.id, interaction.user.id, updates);

            const net = result.payout - bet;
            const status = net > 0 ? "WIN" : net === 0 ? "PUSH" : "LOST";
            const summary = net > 0 ? `You won **${coins(result.payout)}** (**+${coins(net)} profit**).`
                : net === 0 ? `Your **${coins(bet)}** bet was returned.`
                : `You lost **${coins(bet)}**.`;

            await interaction.editReply({
                embeds: [belovedEmbed("\u{1F3B0} Slot Machine")
                    .setDescription(renderSlotReels(finalGrid, status))
                    .addFields(
                        { name: result.label, value: summary, inline: false },
                        { name: "Payout", value: coins(result.payout), inline: true },
                        { name: "Balance", value: coins(newBalance), inline: true }
                    )
                    .setFooter({ text: `${interaction.user.username} \u2022 Beloved Casino` })]
            });
        } finally {
            economy.releaseLock(interaction.guild.id, interaction.user.id);
        }
    }
};
