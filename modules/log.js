const helpers = require('./helpers');

module.exports = function (client) {
  setupCommands(client);
  handleCommands(client);
}

function setupCommands(client) {
  const logCommand = {
    name: 'log',
    description: 'Generates and DMs a text log archive for a given thread or channel.',
    options: [
      {
        name: 'thread',
        description: '#thread or channel name (Default: current thread/channel)',
        required: false,
        type: 7,
      },
      {
        name: 'start',
        description: 'Provide a Discord message link to start from (Default: First or 100th most recent message)',
        required: false,
        type: 3,
      },
      {
        name: 'end',
        description: 'Provide a Discord message link to end at (Default: most recent message)',
        required: false,
        type: 3,
      },
      {
        name: 'increasecap',
        description: 'Logs default to 100 messages. Can increase cap to [number] or "all" (Recommended max: 1000)',
        required: false,
        type: 3,
      }
    ]
  };

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
      const row = new Discord.MessageActionRow().addComponents(
        new Discord.MessageButton().setCustomId('save').setLabel('Save Log').setStyle("SECONDARY"),
      )
      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
      const collector = message.createMessageComponentCollector({});
      collector.on('collect', async i => {
        if (i.customId === "save") {
          // send DM of the RP log
          i.user.send({ files: [file] })
          i.reply({ content: `Sent an exported copy of the RP to your DMs!`, ephemeral: true });
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