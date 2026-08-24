const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed, errorEmbed } = require("../../utils/embeds");
const family = require("../../systems/family");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("disown")
        .setDescription("Disown a child or leave your parent")
        .addUserOption(opt => opt.setName("user").setDescription("The family member to disown / leave").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const targetId = target.id;

        if (targetId === userId) {
            return interaction.reply({ content: "🪞 You can't disown yourself.", ephemeral: true });
        }

        // Check if target is user's child
        const children = family.getChildren(guildId, userId);
        const isChild = children.includes(targetId);

        // Check if target is user's parent
        const parentId = family.getParent(guildId, userId);
        const isParent = parentId === targetId;

        if (!isChild && !isParent) {
            return interaction.reply({
                embeds: [errorEmbed(`<@${targetId}> is not your parent or your child.`)],
                ephemeral: true
            });
        }

        if (isChild) {
            // Parent disowning a child
            const result = family.disown(guildId, userId, targetId);
            if (!result) {
                return interaction.reply({
                    embeds: [errorEmbed("Something went wrong. Could not disown.")],
                    ephemeral: true
                });
            }

            const embed = belovedEmbed("💔 Disowned")
                .setDescription(
                    `<@${userId}> has disowned <@${targetId}>.\n\n` +
                    `They are no longer part of the family. The paperwork has been shredded.`
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (isParent) {
            // Child leaving their parent
            const result = family.disown(guildId, targetId, userId);
            if (!result) {
                return interaction.reply({
                    embeds: [errorEmbed("Something went wrong. Could not leave family.")],
                    ephemeral: true
                });
            }

            const embed = belovedEmbed("🚪 Left the Family")
                .setDescription(
                    `<@${userId}> has left <@${targetId}>'s family.\n\n` +
                    `They packed their bags and moved out. Emancipation complete.`
                );

            return interaction.reply({ embeds: [embed] });
        }
    }
};
