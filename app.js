import 'dotenv/config';
import express, {response} from 'express';
import {
    InteractionResponseFlags,
    InteractionResponseType,
    InteractionType,
    MessageComponentTypes,
    verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
    // Interaction id, type, data and channel_id
    const { id, type, data, channel_id } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name } = data;

        // "test" command
        if (name === 'test') {
            // Send a message into the channel where command was triggered from
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                    components: [
                        {
                            type: MessageComponentTypes.TEXT_DISPLAY,
                            // Fetches a random emoji to send from a helper function
                            content: `hello world ${getRandomEmoji()}`
                        }
                    ]
                },
            });
        }

        if (name === 'clean_up_purchases') {

            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            let lastMessageId = null;
            let totalDeleted = 0;

            const DELETE_BATCH_SIZE = 5;
            const COOLDOWN_MS = 4000;

            while (true) {

                const queryParams = new URLSearchParams({ limit: 100 });

                if (lastMessageId) {
                    queryParams.append("before", lastMessageId);
                }

                const messages = await DiscordRequest(`channels/${channel_id}/messages?${queryParams.toString()}`, {
                    method: 'GET'
                }).then(response => response.json());

                if (messages.length === 0) break;

                lastMessageId = messages[messages.length - 1].id;

                const filteredMessages = messages.filter(message =>
                    message.reactions?.some((reaction) => ["🛍️", "⬇️"].includes(reaction.emoji.name))
                );

                if (filteredMessages.length === 0) continue;

                let deletedThisRound = 0;

                for (const message of filteredMessages) {
                    const request = await DiscordRequest(`channels/${channel_id}/messages/${message.id}`, {
                        method: 'DELETE'
                    });

                    if (request.status === 429) {
                        const data = await response.json();
                        await sleep(10000);
                        continue;
                    }

                    totalDeleted++;
                    deletedThisRound++;

                    if (deletedThisRound >= DELETE_BATCH_SIZE) {
                        console.log(
                            `Deleted ${DELETE_BATCH_SIZE} messages, entering short cooldown...`
                        );

                        await sleep(COOLDOWN_MS);
                        deletedThisRound = 0;
                    }


                    totalDeleted++;
                    await sleep(300);
                }
            }

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                    components: [
                        {
                            type: MessageComponentTypes.TEXT_DISPLAY,
                            content: `${totalDeleted} tracks have been purchased. Associated links have been deleted`
                        }
                    ]
                }
            })
        }

        console.error(`unknown command: ${name}`);
        return res.status(400).json({ error: 'unknown command' });
    }

    console.error('unknown interaction type', type);
    return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
    console.log('Listening on port', PORT);
});
