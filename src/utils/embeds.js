const { EmbedBuilder } = require("discord.js");

const BELOVED_PINK = 0xFF69B4;

/**
 * Create a pre-styled Beloved embed with the pink theme color.
 * @param {string} title - The embed title.
 * @returns {EmbedBuilder}
 */
function belovedEmbed(title) {
    return new EmbedBuilder()
        .setColor(BELOVED_PINK)
        .setTitle(title)
        .setTimestamp();
}

/**
 * Create an error embed for user-facing error messages.
 * @param {string} message - Error description.
 * @returns {EmbedBuilder}
 */
function errorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}

/**
 * Create a success embed.
 * @param {string} message - Success description.
 * @returns {EmbedBuilder}
 */
function successEmbed(message) {
    return new EmbedBuilder()
        .setColor(BELOVED_PINK)
        .setDescription(`✅ ${message}`)
        .setTimestamp();
}

module.exports = {
    BELOVED_PINK,
    belovedEmbed,
    errorEmbed,
    successEmbed
};
