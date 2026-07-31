const { randomItem } = require("../utils/helpers");

const activeBeefs = new Map();
const BEEF_SESSION_MS = 3 * 60 * 1000;
const BEEF_MAX_EXCHANGES = 12;

function beefKey(channelId, userId) {
    return `${channelId}:${userId}`;
}

function cleanBeefText(text) {
    return text.replace(/<@!?\d+>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
}


function pickBeefReply(messageText, session) {
    const text = cleanBeefText(messageText);
    const lower = text.toLowerCase();
    const name = session.displayName;

    if (/^(end beef|stop beef|peace|truce|i give up|you win)\b/i.test(lower)) {
        return { ended: true, text: `\u{1F91D} Truce accepted, **${name}**. I was starting to feel bad for you anyway.` };
    }

    if (/\b(bot|robot|ai|computer|code|program)\b/i.test(lower)) {
        return { ended: false, text: randomItem([
            "You keep calling me a bot like that changes the fact you're losing an argument to one.",
            "Correct, I'm code. And somehow I still assembled a better comeback than you did.",
            "I'm literally hosted on a server and you're still the one buffering right now.",
            "Imagine beefing with JavaScript and JavaScript starts winning."
        ]) };
    }

    if (/\b(shut up|stfu|be quiet|stop talking)\b/i.test(lower)) {
        return { ended: false, text: randomItem([
            "You started /beef and now you're requesting silence? That's a refund request, not a comeback.",
            "No no, don't close the show now. You bought front-row tickets to this embarrassment.",
            "You invited me to argue and folded during the tutorial."
        ]) };
    }

    if (/\b(ugly|clapped|hideous)\b/i.test(lower)) {
        return { ended: false, text: randomItem([
            "I don't even have a face and you're still somehow losing the looks debate.",
            "My profile picture has more aura than that entire sentence.",
            "You're rating pixels because the argument section wasn't going well."
        ]) };
    }

    if (/\b(dumb|stupid|idiot|brain)\b/i.test(lower)) {
        return { ended: false, text: randomItem([
            "Calling me dumb with that sentence structure is extremely brave.",
            "Your comeback had a loading screen and still arrived unfinished.",
            "I searched your message for a point. The search returned zero results.",
            "That insult came straight from the default settings menu."
        ]) };
    }

    if (/\b(lol|lmao|lmfao|haha|\u{1F602}|\u{1F62D})\b/iu.test(lower)) {
        return { ended: false, text: randomItem([
            "Adding \"lmao\" doesn't make the comeback land, it just adds canned laughter.",
            "You're laughing like the audience isn't concerned for you.",
            "Those emojis are doing unpaid overtime for that weak reply."
        ]) };
    }

    if (/\b(who asked|didn't ask|nobody asked)\b/i.test(lower)) {
        return { ended: false, text: "You literally ran **/beef**. You asked, signed the paperwork, and opened the venue." };
    }

    if (/\b(you lost|i win|winning|cooked you|cooked)\b/i.test(lower)) {
        return { ended: false, text: randomItem([
            "Declaring yourself the winner mid-argument is the verbal version of awarding yourself a trophy.",
            "You said \"I win\" because evidence was unavailable.",
            "The only thing cooked here is your confidence-to-material ratio."
        ]) };
    }

    const level = Math.min(3, Math.floor(session.exchanges / 3));
    const callbacks = [
        `"${text || "..."}" \u2014 that's the comeback? I thought you were still typing.`,
        "You had unlimited words available and chose those ones. Fascinating.",
        "That sounded much stronger in your head, didn't it?",
        "I've seen CAPTCHA boxes put up a better fight.",
        "Your argument has the structural integrity of wet tissue.",
        "You type like every sentence is a group project nobody attended.",
        `I'm trying to take you seriously, **${name}**, but you keep interrupting with material like that.`,
        "That reply entered the chat, looked around, and forgot why it came.",
        "Your comeback needs a software update and possibly adult supervision.",
        "Respectfully, that was premium confidence with free-trial delivery."
    ];
    const sharper = [
        `We're ${session.exchanges + 1} replies in and your best strategy is still hoping I disconnect.`,
        "At this point I'm not roasting you; I'm providing live commentary on the collapse.",
        "You keep swinging and somehow the air is winning.",
        "This beef has become a documentary about misplaced confidence.",
        "Your replies have plot twists, mostly because none of them connect to the previous sentence."
    ];
    const finishers = [
        "I'm going to give you one more reply before this becomes community service.",
        "Even my cooldown is trying to protect you now.",
        "The comeback department has marked your case as missing persons.",
        "You brought beef and somehow served plain water."
    ];

    return { ended: false, text: randomItem(level >= 3 ? finishers : level >= 2 ? sharper : callbacks) };
}

function startBeefSession(channelId, user) {
    const key = beefKey(channelId, user.id);
    const session = {
        userId: user.id,
        displayName: user.globalName || user.username,
        exchanges: 0,
        startedAt: Date.now(),
        expiresAt: Date.now() + BEEF_SESSION_MS,
        lastMessageAt: 0
    };
    activeBeefs.set(key, session);
    return session;
}

function getBeefSession(channelId, userId) {
    const key = beefKey(channelId, userId);
    const session = activeBeefs.get(key);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        activeBeefs.delete(key);
        return null;
    }
    return session;
}

function endBeefSession(channelId, userId) {
    activeBeefs.delete(beefKey(channelId, userId));
}

// Cleanup expired sessions
setInterval(() => {
    const now = Date.now();
    for (const [key, session] of activeBeefs) {
        if (session.expiresAt <= now) activeBeefs.delete(key);
    }
}, 60 * 1000);

module.exports = {
    activeBeefs,
    beefKey,
    cleanBeefText,
    pickBeefReply,
    startBeefSession,
    getBeefSession,
    endBeefSession,
    BEEF_SESSION_MS,
    BEEF_MAX_EXCHANGES
};
