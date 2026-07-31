const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");

const activeFights = new Map();

function healthBar(hp) {
    const full = Math.max(0, Math.min(10, Math.round(hp / 10)));
    return "\u2588".repeat(full) + "\u2591".repeat(10 - full);
}

function fightButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`fight:punch:${gameId}`).setLabel("Punch").setEmoji("\u{1F44A}").setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fight:block:${gameId}`).setLabel("Block").setEmoji("\u{1F6E1}\uFE0F").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fight:special:${gameId}`).setLabel("Special").setEmoji("\u{1F4A5}").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function inviteButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`fightaccept:yes:${gameId}`).setLabel("Accept Fight").setEmoji("\u2694\uFE0F").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fightaccept:no:${gameId}`).setLabel("Run Away").setEmoji("\u{1F3C3}").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function fightEmbed(game, ended = false, finalText = null) {
    const [one, two] = game.players;
    return new EmbedBuilder().setColor(BELOVED_PINK)
        .setTitle(ended ? "\u{1F3C6} Fight Finished" : "\u2694\uFE0F Beloved Fight Club")
        .setDescription(
            `<@${one}>  **${game.hp[one]} HP**\n${healthBar(game.hp[one])}\n\n` +
            `<@${two}>  **${game.hp[two]} HP**\n${healthBar(game.hp[two])}\n\n` +
            (finalText || `\u{1F3AF} **Current turn:** <@${game.turn}>\n${game.lastAction}`)
        )
        .setFooter({ text: ended ? "Beloved accepts no liability for hurt feelings." : "Punch, block, or use your special attack." })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fight")
        .setDescription("Challenge someone to a button battle")
        .addUserOption(opt => opt.setName("user").setDescription("Who do you want to fight?").setRequired(true)),

    activeFights,

    async execute(interaction) {
        const opponent = interaction.options.getUser("user");
        if (opponent.bot) return interaction.reply({ content: "\u{1F916} Fighting a bot is how robot uprisings begin.", ephemeral: true });
        if (opponent.id === interaction.user.id) return interaction.reply({ content: "\u{1F94A} You shadowboxed and somehow lost.", ephemeral: true });

        const gameId = interaction.id;
        const game = {
            players: [interaction.user.id, opponent.id], hp: {}, blocking: {}, specialUsed: {},
            started: false, ended: false, turn: null, lastAction: "", inviteTimer: null
        };
        for (const id of game.players) { game.hp[id] = 100; game.blocking[id] = false; game.specialUsed[id] = false; }
        activeFights.set(gameId, game);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(BELOVED_PINK).setTitle("\u2694\uFE0F Fight Challenge")
                .setDescription(`<@${interaction.user.id}> challenged <@${opponent.id}> to a fight!\n\nDo you accept?`)
                .setFooter({ text: "Challenge expires in 60 seconds." }).setTimestamp()],
            components: [inviteButtons(gameId)], allowedMentions: { users: game.players }
        });

        game.inviteTimer = setTimeout(async () => {
            if (!activeFights.has(gameId) || game.started) return;
            game.ended = true; activeFights.delete(gameId);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(BELOVED_PINK).setTitle("\u23F0 Challenge Expired")
                    .setDescription(`<@${opponent.id}> did not answer. <@${interaction.user.id}> wins by boredom.`).setTimestamp()],
                components: [inviteButtons(gameId, true)]
            }).catch(() => {});
        }, 60_000);
    },

    async handleButton(interaction, action, gameId) {
        const game = activeFights.get(gameId);
        if (!game || game.ended) return interaction.reply({ content: "This fight is already over.", ephemeral: true });

        // Handle accept/reject
        if (action === "yes" || action === "no") {
            if (interaction.user.id !== game.players[1]) return interaction.reply({ content: "This challenge is not for you.", ephemeral: true });
            clearTimeout(game.inviteTimer);
            if (action === "no") {
                game.ended = true; activeFights.delete(gameId);
                return interaction.update({
                    embeds: [new EmbedBuilder().setColor(BELOVED_PINK).setTitle("\u{1F3C3} Fight Avoided")
                        .setDescription(`<@${game.players[1]}> ran away from <@${game.players[0]}>. Tactical retreat or pure fear?`).setTimestamp()],
                    components: [inviteButtons(gameId, true)]
                });
            }
            game.started = true;
            game.turn = game.players[Math.floor(Math.random() * 2)];
            game.lastAction = "The bell rings. Choose your move!";
            return interaction.update({ embeds: [fightEmbed(game)], components: [fightButtons(gameId)] });
        }

        // Fight moves
        if (!game.started) return interaction.reply({ content: "This fight hasn't started yet.", ephemeral: true });
        if (!game.players.includes(interaction.user.id)) return interaction.reply({ content: "\u{1F37F} Spectators cannot jump into the ring.", ephemeral: true });
        if (interaction.user.id !== game.turn) return interaction.reply({ content: "\u23F3 It is not your turn.", ephemeral: true });

        const attacker = interaction.user.id;
        const defender = game.players.find(id => id !== attacker);
        let damage = 0;

        if (action === "block") {
            game.blocking[attacker] = true;
            game.lastAction = `\u{1F6E1}\uFE0F <@${attacker}> prepares to block the next attack.`;
        } else if (action === "special") {
            if (game.specialUsed[attacker]) return interaction.reply({ content: "\u{1F4A5} You already used your special attack.", ephemeral: true });
            game.specialUsed[attacker] = true;
            damage = Math.floor(Math.random() * 21) + 20;
            game.lastAction = `\u{1F4A5} <@${attacker}> used a special attack for **${damage} damage**!`;
        } else {
            damage = Math.floor(Math.random() * 16) + 8;
            game.lastAction = `\u{1F44A} <@${attacker}> punched <@${defender}> for **${damage} damage**!`;
        }

        if (damage > 0) {
            if (game.blocking[defender]) {
                damage = Math.max(1, Math.floor(damage / 2));
                game.blocking[defender] = false;
                game.lastAction += ` <@${defender}> blocked, reducing it to **${damage}**.`;
            }
            game.hp[defender] = Math.max(0, game.hp[defender] - damage);
        }

        if (game.hp[defender] <= 0) {
            game.ended = true; activeFights.delete(gameId);
            return interaction.update({
                embeds: [fightEmbed(game, true, `\u{1F3C6} <@${attacker}> wins!\n\u{1F480} <@${defender}> has been folded like a lawn chair.`)],
                components: [fightButtons(gameId, true)]
            });
        }

        game.turn = defender;
        return interaction.update({ embeds: [fightEmbed(game)], components: [fightButtons(gameId)] });
    }
};
