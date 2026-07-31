const { Events } = require("discord.js");
const logger = require("../utils/logger");
const blacklistSys = require("../systems/blacklist");
const conflictGuard = require("../systems/conflictGuard");
const beefSys = require("../systems/beef");
const { randomItem } = require("../utils/helpers");

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client) {
        if (message.author.bot) return;

        try {
            // Blacklist check
            if (await blacklistSys.processBlacklistedMessage(message)) return;

            // Country game guess check
            const countryCmd = client.commands.get("countrygame");
            if (countryCmd?.checkGuess?.(message)) return;

            // Beef session handler
            const beef = beefSys.getBeefSession(message.channel.id, message.author.id);
            if (beef) {
                if (beef.expiresAt <= Date.now()) {
                    beefSys.endBeefSession(message.channel.id, message.author.id);
                    await message.reply("\u{1F969} Beef expired. Run **/beef** when you're ready for another round.");
                    return;
                }

                if (!message.content.startsWith("/")) {
                    const now = Date.now();
                    if (now - beef.lastMessageAt < 900) {
                        await message.react("\u23F3").catch(() => {});
                        return;
                    }

                    beef.lastMessageAt = now;
                    const reply = beefSys.pickBeefReply(message.content, beef);
                    beef.exchanges += 1;
                    beef.expiresAt = now + beefSys.BEEF_SESSION_MS;

                    if (reply.ended) {
                        beefSys.endBeefSession(message.channel.id, message.author.id);
                        await message.reply(reply.text);
                        return;
                    }

                    if (beef.exchanges >= beefSys.BEEF_MAX_EXCHANGES) {
                        beefSys.endBeefSession(message.channel.id, message.author.id);
                        await message.reply(
                            `${reply.text}\n\n\u{1F3C1} **Beef over.** Twelve rounds completed. Beloved wins by emotional damage and server costs.`
                        );
                        return;
                    }

                    await message.reply(`${reply.text}\n\n-# Round ${beef.exchanges}/${beefSys.BEEF_MAX_EXCHANGES} \u2022 say "end beef" to stop`);
                    return;
                }
            }

            // Conflict Guard
            await conflictGuard.processConflictMessage(message);

            // Bot mention response
            if (message.mentions.has(client.user) && !message.mentions.everyone) {
                const replies = [
                    "\u{1F440} You summoned me?",
                    "\u{1F496} Beloved has entered the chat.",
                    "\u{1F916} I was busy doing important bot things.",
                    "\u{1F62D} Another ping? I just sat down.",
                    "\u{1FAE1} Reporting for duty.",
                    "\u{1F485} I have arrived. Try to remain calm.",
                    "\u{1F4DE} Beloved customer service, how may I judge you?"
                ];
                await message.reply(randomItem(replies));
            }
        } catch (error) {
            logger.error("MessageCreate", `Handler error: ${error.message}`, { stack: error.stack });
        }
    }
};
