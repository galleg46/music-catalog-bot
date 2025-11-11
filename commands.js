import 'dotenv/config';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
    name: 'test',
    description: 'Basic command',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
};

const CLEAR_PURCHASED_LINKS_COMMAND = {
    name: 'clean_up_purchases',
    description: 'Clear purchased links',
    type: 1,
    integration_types: [0],
    contexts: [0]
};

// TODO: delete challenge command from bot
const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, CLEAR_PURCHASED_LINKS_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
