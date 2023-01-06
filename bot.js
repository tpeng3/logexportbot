// bot.js is the main file, start the bot from here: ``node bot`` in console.
global.config = require('./config.json');
global.Discord = require("discord.js");
const { Client, Intents } = Discord;
global.client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
  ]
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.setMaxListeners(0);

  client.commands = [];
  require('./modules/log')(client);

  process.on("uncaughtException", (e) => { console.log(e) });
  client.on("uncaughtException", (e) => { console.log(e) });

  // refresh slash commands
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v9');
  const rest = new REST({ version: '9' }).setToken(config.token);
  (async () => {
    try {
      await rest.put(Routes.applicationGuildCommands(config.clientID, config.guildID), { body: client.commands });
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  })();
});

client.login(config.token);
