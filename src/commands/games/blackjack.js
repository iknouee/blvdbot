const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, clampBet, progressBar } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const activeBlackjackGames = new Map();

const CARD_SUITS = ["\u2660\uFE0F", "\u2665\uFE0F", "\u2666\uFE0F", "\u2663\uFE0F"];
const CARD_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) for (const rank of CARD_RANKS) deck.push({ suit, rank });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
}

function handValue(hand) {
    let value = 0, aces = 0;
    for (const card of hand) {
        if (card.rank === "A") { value += 11; aces++; }
        else if (["K","Q","J"].includes(card.rank)) value += 10;
        else value += Number(card.rank);
    }
    while (value > 21 && aces) { value -= 10; aces--; }
    return value;
}

function renderHand(hand, hidden = false) {
    if (hidden) return `${hand[0].rank}${hand[0].suit}  \u{1F3B4}`;
    return hand.map(c => `${c.rank}${c.suit}`).join("  ");
}

function bjButtons(id, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`blackjack:hit:${id}`).setLabel("Hit").setEmoji("\u2795").setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`blackjack:stand:${id}`).setLabel("Stand").setEmoji("\u270B").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`blackjack:double:${id}`).setLabel("Double").setEmoji("\u{1F4B0}").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function bjEmbed(game, reveal = false, result = null) {
    const pv = handValue(game.player);
    const dv = reveal ? handValue(game.dealer) : "?";
    return belovedEmbed("\u{1F0CF} Beloved Blackjack")
        .setDescription(result || "Choose your move below.")
        .addFields(
            { name: `Dealer ${reveal ? `\u2022 ${dv}` : "\u2022 hidden"}`, value: `> ${renderHand(game.dealer, !reveal)}`, inline: false },
            { name: `Your hand \u2022 ${pv}`, value: `> ${renderHand(game.player)}`, inline: false },
            { name: "Bet", value: coins(game.bet), inline: true },
            { name: "Status", value: pv > 21 ? "Busted \u{1F4A5}" : `${progressBar(Math.min(pv, 21), 21, 10)} ${pv}/21`, inline: true }
        )
        .setFooter({ text: "Dealer stands on 17 \u2022 Blackjack pays 3:2" });
}

async function finishBlackjack(interaction, game, reason = "stand") {
    if (game.ended) return;
    game.ended = true;
    if (reason !== "bust") while (handValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
    const pv = handValue(game.player), dv = handValue(game.dealer);
    let payout = 0, result;
    const natural = game.player.length === 2 && pv === 21;

    if (pv > 21) result = `\u{1F4A5} **BUST!** You lost ${coins(game.bet)}.`;
    else if (dv > 21 || pv > dv) {
        payout = natural ? Math.floor(game.bet * 2.5) : game.bet * 2;
        result = natural ? `\u2728 **BLACKJACK!** You won ${coins(payout - game.bet)} profit.` : `\u{1F3C6} **YOU WIN!** Profit: ${coins(game.bet)}.`;
    } else if (pv === dv) { payout = game.bet; result = "\u{1F91D} **PUSH.** Your bet was returned."; }
    else result = `\u{1F480} **DEALER WINS.** You lost ${coins(game.bet)}.`;

    const account = economy.getUser(game.guildId, game.userId);
    const updates = { balance: account.balance + payout };
    if (payout > game.bet) updates.total_won = account.total_won + (payout - game.bet);
    else if (!payout) updates.total_lost = account.total_lost + game.bet;
    economy.update(game.guildId, game.userId, updates);
    activeBlackjackGames.delete(game.id);

    await interaction.update({
        embeds: [bjEmbed(game, true, `${result}\n\n**Balance:** ${coins(account.balance + payout)}`)],
        components: [bjButtons(game.id, true)]
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play interactive blackjack against Beloved")
        .addIntegerOption(opt => opt.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    activeBlackjackGames,

    async execute(interaction) {
        const bet = interaction.options.getInteger("bet");
        const account = economy.getUser(interaction.guild.id, interaction.user.id);

        if (!clampBet(account.balance, bet)) {
            return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });
        }

        const existing = [...activeBlackjackGames.values()].find(g => g.guildId === interaction.guild.id && g.userId === interaction.user.id && !g.ended);
        if (existing) return interaction.reply({ content: "\u{1F0CF} Finish your current blackjack hand first.", ephemeral: true });

        economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - bet });
        const deck = createDeck();
        const game = {
            id: interaction.id, guildId: interaction.guild.id, userId: interaction.user.id,
            bet, deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()], ended: false
        };
        activeBlackjackGames.set(game.id, game);

        await interaction.reply({ embeds: [bjEmbed(game)], components: [bjButtons(game.id)] });

        if (handValue(game.player) === 21) {
            await new Promise(r => setTimeout(r, 800));
            const fake = { ...interaction, update: payload => interaction.editReply(payload) };
            return finishBlackjack(fake, game, "stand");
        }
    },

    async handleButton(interaction, action, gameId) {
        const game = activeBlackjackGames.get(gameId);
        if (!game || game.ended) return interaction.reply({ content: "This blackjack table is closed.", ephemeral: true });
        if (interaction.user.id !== game.userId) return interaction.reply({ content: "\u{1F0CF} This is not your hand.", ephemeral: true });

        if (action === "hit") {
            game.player.push(game.deck.pop());
            if (handValue(game.player) >= 21) return finishBlackjack(interaction, game, handValue(game.player) > 21 ? "bust" : "stand");
            return interaction.update({ embeds: [bjEmbed(game)], components: [bjButtons(game.id)] });
        }
        if (action === "double") {
            if (game.player.length !== 2) return interaction.reply({ content: "You can only double on your first move.", ephemeral: true });
            const acc = economy.getUser(game.guildId, game.userId);
            if (acc.balance < game.bet) return interaction.reply({ content: `You need another ${coins(game.bet)} to double.`, ephemeral: true });
            economy.update(game.guildId, game.userId, { balance: acc.balance - game.bet });
            game.bet *= 2;
            game.player.push(game.deck.pop());
            return finishBlackjack(interaction, game, handValue(game.player) > 21 ? "bust" : "stand");
        }
        if (action === "stand") return finishBlackjack(interaction, game, "stand");
    }
};
