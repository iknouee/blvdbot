require("dotenv").config();

const path = require("path");
const { REST, Routes } = require("discord.js");
const { loadCommands } = require("./utils/commandHandler");
const logger = require("./utils/logger");

const { commands } = loadCommands(path.join(__dirname, "commands"));

const commandData = [...commands.values()].map(cmd => cmd.data.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        logger.info("Deploy", `Deploying ${commandData.length} commands...`);

        if (process.env.GUILD_ID) {
            // Guild-specific (instant, good for development)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandData }
            );
            logger.info("Deploy", `Deployed ${commandData.length} guild commands to ${process.env.GUILD_ID}`);
        } else {
            // Global (takes up to 1 hour to propagate)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commandData }
            );
            logger.info("Deploy", `Deployed ${commandData.length} global commands`);
        }
    } catch (error) {
        logger.error("Deploy", `Command deployment failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
})();
