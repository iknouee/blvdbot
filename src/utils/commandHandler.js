const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");
const logger = require("./logger");

/**
 * Recursively load all command files from a directory.
 * Each command file must export: { data: SlashCommandBuilder, execute: Function }
 * Optionally: { buttons: Function, category: string }
 */
function loadCommands(commandsDir) {
    const commands = new Collection();
    const categories = new Map();

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                try {
                    const command = require(fullPath);
                    if (!command.data || !command.execute) {
                        logger.warn("CommandHandler", `Skipping ${fullPath}: missing data or execute`);
                        continue;
                    }

                    const name = command.data.name;
                    commands.set(name, command);

                    // Derive category from directory name
                    const category = command.category || path.basename(path.dirname(fullPath));
                    if (!categories.has(category)) categories.set(category, []);
                    categories.get(category).push(name);

                    logger.debug("CommandHandler", `Loaded command: ${name} [${category}]`);
                } catch (error) {
                    logger.error("CommandHandler", `Failed to load ${fullPath}: ${error.message}`);
                }
            }
        }
    }

    walk(commandsDir);
    logger.info("CommandHandler", `Loaded ${commands.size} commands in ${categories.size} categories`);
    return { commands, categories };
}

module.exports = { loadCommands };
