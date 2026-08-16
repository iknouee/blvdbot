// ─── Panto Farewell Message ──────────────────────────────────────────────────

client.once("clientReady", async () => {
    const channelId = process.env.MAIN_CHAT_CHANNEL_ID;

    if (!channelId) {
        logger.warn("PantoFarewell", "MAIN_CHAT_CHANNEL_ID is not set.");
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased()) {
            logger.error("PantoFarewell", "Main chat channel was not found.");
            return;
        }

        // Check recent messages so we don't send it twice after a restart
        const recentMessages = await channel.messages.fetch({ limit: 100 });

        const alreadySent = recentMessages.some(
            msg =>
                msg.author.id === client.user.id &&
                msg.content.includes("a message from panto 🤍")
        );

        if (alreadySent) {
            logger.info(
                "PantoFarewell",
                "Farewell message has already been sent."
            );
            return;
        }

        const farewellMessage = `**a message from panto 🤍**

panto has officially left blvd

actually crazy saying that after everything 😭

he came into blvd not knowing what to expect and somehow ended up meeting some of the nicest people hes ever met. all the random vcs, staying up way too late, laughing over the dumbest stuff, helping people when they needed someone, stupid arguments and just random moments that nobody thought would actually become memories

those are the things hes never gonna forget

even if he never speaks to some of these people again, he'll always remember the time everyone was here together. some of you made his days better without even knowing it and blvd genuinely became a big part of his life for a while

it wasnt always good tho. being around these servers so much eventually started messing with his head and he knew it was probably time to leave and move on

but he doesnt regret any of it

the people he met, the laughs, the memories, the late nights, all of it was worth it. one day everyones gonna move on and blvd probably wont even be the same anymore, but he'll always be able to look back at this time and remember how good we actually had it 😭

so thank you to everyone who spoke to him, helped him, checked up on him, made him laugh or was just there. genuinely thank you for making these memories what they were

you probably wont see panto around anymore but he definitely wont forget you lot 🤍

what a fucking era man

rip panto lol 🕊️`;

        await channel.send(farewellMessage);

        logger.info(
            "PantoFarewell",
            "Panto farewell message sent successfully."
        );
    } catch (error) {
        logger.error(
            "PantoFarewell",
            `Failed to send farewell message: ${error.message}`
        );
    }
});
