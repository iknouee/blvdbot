const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { belovedEmbed, errorEmbed } = require("../../utils/embeds");
const family = require("../../systems/family");

const activeAdoptions = new Map();
const MAX_CHILDREN = 10;

function adoptButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adopt:accept:${gameId}`).setLabel("Accept").setEmoji("💕").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`adopt:reject:${gameId}`).setLabel("Reject").setEmoji("🚫").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function adoptEmbed(game, result = null) {
    return belovedEmbed(result ? "👨‍👩‍👧 Adoption Results" : "👨‍👩‍👧 Adoption Request")
        .setDescription(
            `<@${game.parentId}> wants to adopt <@${game.childId}>!\n\n` +
            `${result || "Will they accept this totally normal Discord family arrangement?"}`
        )
        .setFooter({ text: result ? "Beloved has witnessed this family moment." : "Only the target user can respond." });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adopt")
        .setDescription("Adopt a user into your family")
        .addUserOption(opt => opt.setName("user").setDescription("Who do you want to adopt?").setRequired(true)),

    activeAdoptions,

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const guildId = interaction.guild.id;
        const parentId = interaction.user.id;
        const childId = target.id;

        // Validation checks
        if (target.bot) {
            return interaction.reply({ content: "🤖 Bots don't need parents... or do they?", ephemeral: true });
        }
        if (childId === parentId) {
            return interaction.reply({ content: "🪞 You can't adopt yourself. That's not how families work.", ephemeral: true });
        }

        // Check if target already has a parent
        const existingParent = family.getParent(guildId, childId);
        if (existingParent) {
            return interaction.reply({ content: `❌ <@${childId}> already has a parent (<@${existingParent}>). They must be disowned first.`, ephemeral: true });
        }

        // Check if parent has too many children
        const currentChildren = family.getChildren(guildId, parentId);
        if (currentChildren.length >= MAX_CHILDREN) {
            return interaction.reply({ content: `❌ You already have ${MAX_CHILDREN} children! That's the maximum.`, ephemeral: true });
        }

        // Check for circular adoption (can't adopt your own ancestor)
        const allMembers = family.getAllMembers(guildId, parentId);
        if (allMembers.includes(childId)) {
            // Check if childId is an ancestor of parentId
            let current = parentId;
            let isAncestor = false;
            const visited = new Set();
            while (current) {
                if (visited.has(current)) break;
                visited.add(current);
                if (current === childId) { isAncestor = true; break; }
                current = family.getParent(guildId, current);
            }
            if (isAncestor) {
                return interaction.reply({ content: "🔄 You can't adopt your own ancestor! That would break the space-time continuum.", ephemeral: true });
            }
        }

        // Check no pending adoption involving this user
        const pending = [...activeAdoptions.values()].some(g => !g.ended && [g.parentId, g.childId].includes(parentId));
        if (pending) {
            return interaction.reply({ content: "⏳ You already have a pending adoption request.", ephemeral: true });
        }

        // Create adoption request
        const gameId = interaction.id;
        const game = { parentId, childId, ended: false, timer: null };
        activeAdoptions.set(gameId, game);

        await interaction.reply({
            embeds: [adoptEmbed(game)],
            components: [adoptButtons(gameId)],
            allowedMentions: { users: [childId, parentId] }
        });

        // Timeout after 60 seconds
        game.timer = setTimeout(async () => {
            if (!activeAdoptions.has(gameId)) return;
            game.ended = true;
            activeAdoptions.delete(gameId);
            await interaction.editReply({
                embeds: [adoptEmbed(game, `⏰ <@${game.childId}> didn't respond. The adoption papers have expired.`)],
                components: [adoptButtons(gameId, true)]
            }).catch(() => {});
        }, 60_000);
    },

    async handleButton(interaction, choice, gameId) {
        const game = activeAdoptions.get(gameId);
        if (!game || game.ended) {
            return interaction.reply({ content: "This adoption request has already ended.", ephemeral: true });
        }
        if (interaction.user.id !== game.childId) {
            return interaction.reply({ content: "🚫 This adoption request isn't for you.", ephemeral: true });
        }

        game.ended = true;
        activeAdoptions.delete(gameId);
        clearTimeout(game.timer);

        let result;
        if (choice === "accept") {
            // Double-check the child still doesn't have a parent
            const existingParent = family.getParent(interaction.guildId, game.childId);
            if (existingParent) {
                result = `❌ <@${game.childId}> was already adopted by someone else!`;
            } else {
                const at = family.adopt(interaction.guildId, game.parentId, game.childId);
                result = `💕 <@${game.childId}> has been adopted by <@${game.parentId}>!\n\n` +
                    `Welcome to the family! 🏠\n` +
                    `📅 Adopted <t:${Math.floor(at / 1000)}:R>`;
            }
        } else {
            result = `🚫 <@${game.childId}> declined the adoption.\n\n<@${game.parentId}> will have to find another child.`;
        }

        return interaction.update({
            embeds: [adoptEmbed(game, result)],
            components: [adoptButtons(gameId, true)]
        });
    }
};
