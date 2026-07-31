const { Events, ActivityType } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        logger.info("Client", `Beloved online as ${client.user.tag}`);

        client.user.setPresence({
            activities: [{ name: "judging humans \u{1F495}", type: ActivityType.Watching }],
            status: "online"
        });
    }
};
