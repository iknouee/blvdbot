const db = require("../utils/database");
const { normaliseBlacklistText } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * Check if a message contains a blacklisted word and return the match.
 * @param {string} guildId
 * @param {string} content
 * @returns {string|null} The matched word, or null.
 */
function findBlacklistedWord(guildId, content) {
    const clean = normaliseBlacklistText(content);
    if (!clean) return null;

    const words = db.getGuildBlacklist(guildId);
    return words.find(entry => {
        const blocked = normaliseBlacklistText(entry);
        if (!blocked) return false;
        return (` ${clean} `).includes(` ${blocked} `);
    }) || null;
}

/**
 * Process a message for blacklisted words. Deletes if matched.
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>} Whether the message was deleted.
 */
async function processBlacklistedMessage(message) {
    if (!message.guild || !message.content) return false;

    const matched = findBlacklistedWord(message.guild.id, message.content);
    if (!matched) return false;

    try {
        await message.delete();
        const notice = await message.channel.send({
            content: `\u{1F6AB} <@${message.author.id}>, that message contained a blacklisted word and was deleted.`,
            allowedMentions: { users: [message.author.id] }
        });
        setTimeout(() => notice.delete().catch(() => {}), 5000);
    } catch (error) {
        logger.error("Blacklist", `Could not delete message: ${error.message}`);
    }

    return true;
}

module.exports = {
    findBlacklistedWord,
    processBlacklistedMessage,
    getWords: db.getGuildBlacklist,
    addWord: db.addBlacklistWord,
    removeWord: db.removeBlacklistWord,
    clear: db.clearBlacklist
};
