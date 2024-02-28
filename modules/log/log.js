const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const helpers = require('./helpers');

module.exports = function (client) {
  setupCommands(client);
  handleCommands(client);
}

function setupCommands(client) {
  const logCommand = new SlashCommandBuilder()
    .setName('log')
    .setDescription('Generates and exports a log archive for a provided thread or channel.')
    .addChannelOption(option =>
      option.setName('thread')
        .setDescription('#thread or channel name (Default: current thread/channel)'))
    .addStringOption(option =>
      option.setName('start')
        .setDescription('Provide a Discord message link to start from (Default: The last 100 messages)'))
    .addStringOption(option =>
      option.setName('end')
        .setDescription('Provide a Discord message link to end at (Default: most recent message)'))
    .addStringOption(option =>
      option.setName('increasecap')
        .setDescription('By default, the limit is 100. Can increase cap using "all" or specifying a [number]'))

  client.commands.push(logCommand);
}

function handleCommands(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "log") {
      await interaction.deferReply();
      let thread = interaction.options.getChannel('thread') || client.channels.cache.get(interaction.channelId);

      let capNumber = interaction.options.getString('increasecap');
      if (capNumber && capNumber.toLowerCase() !== "all" && parseInt(capNumber) <= 100) {
        return replyError(interaction, "The default message cap is 100, we can't go lower.")
      }

      let startPost;
      if (interaction.options.getString('start')) {
        const postId = getPostId(interaction.options.getString('start'));
        if (!postId) {
          return replyError(interaction, interaction.options.getString('start') + " is not a Discord message link.", true)
        }
        try {
          startPost = await thread.messages.fetch(postId);
        } catch (e) {
          return replyError(interaction, "Unable to find the post for " + interaction.options.getString('start') + ". Make sure to mention a thread/channel.", true)
        }
      }

      let endPost;
      if (interaction.options.getString('end')) {
        const postId = getPostId(interaction.options.getString('end'));
        if (!postId) {
          return replyError(interaction, interaction.options.getString('start') + " is not a Discord message link.", true)
        }
        try {
          endPost = await thread.messages.fetch(postId);
        } catch (e) {
          return replyError(interaction, "Unable to find post for " + interaction.options.getString('end') + ". Make sure to mention a thread/channel.", true)
        }
      }

      const { participants, textlog, messages } = await helpers.parseMessages(thread, startPost, endPost, capNumber);
      if (textlog.length < 1 || Object.keys(participants).length < 1) {
        return replyError(interaction, "No participant messages were found for <#" + thread.id + "> with these settings.", true);
      }
      const { embed, file } = helpers.generateReport(thread, participants, textlog, messages, startPost);

      const selectRow = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select')
            .setPlaceholder('Toggle the dropdown to get a save of the log')
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('Save as Markdown').setValue('markdown')
                .setDescription('DMs the log as a markdown file')
                .setEmoji('📖'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Save as Text').setValue('text')
                .setDescription('DMs the log as a regular text file')
                .setEmoji('📝')
            ),
        )

      const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow],
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({});
      collector.on('collect', async i => {
        const value = i.values[0]
        if (value === "markdown") {
          i.reply({ content: `Sent a markdown copy of the log to your DMs!`, ephemeral: true });
          const result = await helpers.exportAsMarkdown(thread, participants, textlog);
          i.user.send({ content: "Log for " + message.url,  files: [result] })
        } else if (value === "text") {
          i.user.send({ content: "Log for " + message.url, files: [file] })
          i.reply({ content: `Sent a text copy of the log to your DMs!`, ephemeral: true });
        } else {
          i.reply({ content: `Error: this button is no longer active.`, ephemeral: true });
          collector.stop();
        }
      })
    }
  })
}

const getPostId = (link) => {
  return link.split("/").at(-1);
}