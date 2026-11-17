import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import * as ping from './modules/ping.ts';
import * as embed from './modules/embed.ts';
import * as initReactions from './modules/reactions.ts';
import * as fs from 'fs';
import { QuickDB, JSONDriver } from 'quick.db';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ERROR_MESSAGE = "Sorry, it looks like Hotato ran into an error just now. Please contact support at https://www.shuttlefrog.com/hotato-bot/ if this error persists.";
const jsonDriver = new JSONDriver();
global.db = new QuickDB({ driver: jsonDriver });
global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
client.login(process.env.TOKEN);
client.on("clientReady", async () => {
    console.log(`Starting up ${client.user.tag}!`);
    client.setMaxListeners(0);
    client.commands = new Collection();
    ping.default(client);
    embed.default(client);
    initReactions.default(client);
    const commandsPath = path.join(import.meta.dirname, 'modules/commands');
    const commandCategories = fs.readdirSync(commandsPath);
    for (let folder of commandCategories) {
        const commandFiles = fs.readdirSync(path.join(commandsPath, folder));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, folder, file);
            const fileUrl = pathToFileURL(filePath).href;
            const commandModule = await import(fileUrl);
            const command = commandModule.default;
            if (!command)
                continue;
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
            else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
    process.on("uncaughtException", (e) => { console.log(e); });
    client.on("uncaughtException", (e) => { console.log(e); });
    // refresh slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    (async () => {
        try {
            // The put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), 
            // Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
            { body: Array.from(Array.from(client.commands, i => i[1].data)) });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        }
        catch (error) {
            console.error(error);
        }
    })();
});
// slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand() && !interaction.isAutocomplete() && !interaction.isUserContextMenuCommand())
        return;
    if (!interaction.client.commands)
        return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    if (interaction.isAutocomplete()) {
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(error);
        }
    }
    else if (interaction.isUserContextMenuCommand()) {
        try {
            await command.contextMenu(interaction);
        }
        catch (error) {
            console.error(error);
        }
    }
    else if (interaction.isCommand()) {
        try {
            await command.execute(interaction);
        }
        catch (error) {
            let content = 'There was an error while executing this command! Please contact mods.';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content, ephemeral: true });
            }
            else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    }
});
// followup button handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton())
        return;
    if (["forward", "back", "jump"].includes(interaction.customId))
        return;
    const command = interaction.client.commands.get(interaction.customId.split("|")[0]);
    if ((!command || !command.followup)) {
        return;
    }
    try {
        await command.followup(interaction);
    }
    catch (error) {
        console.log(error);
        console.log(`WARNING: ${interaction.customId} failed to execute`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: ERROR_MESSAGE, ephemeral: true });
        }
        else {
            await interaction.reply({ content: ERROR_MESSAGE, ephemeral: true });
        }
    }
});
// global dropdown menu handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu())
        return;
    const command = interaction.client.commands.get(interaction.customId.split("|")[0]);
    if ((!command || !command.followup)) {
        return;
    }
    try {
        await command.followup(interaction);
    }
    catch (error) {
        console.log(error);
        console.log(`WARNING: ${interaction.customId} failed to execute`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: ERROR_MESSAGE, ephemeral: true });
        }
        else {
            await interaction.reply({ content: ERROR_MESSAGE, ephemeral: true });
        }
    }
});
