const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

// generate participant string
function getParticipantString(participants) {
  return Object.values(participants)
    .sort((a, b) => b.wc - a.wc)
    .map(i => (i.isBot ? i.displayname : `<@${i.id}>`) + ` (WC: ${i.wc}, Files: ${i.totalpics})`)
    .join("\n");
}

// parses discord messages
async function parseMessages(channel, startPost = null, endPost = null, capNumber = null) {
  const participants = {}
  const textlog = [];
  let messages = await channel.messages.fetch({ limit: 100, ...(endPost && { before: endPost.id }) });
  if (endPost) messages = messages.set(endPost.id, endPost)
  if (capNumber) {
    let pointer = messages.at(-1);
    while (pointer) {
      await channel.messages
        .fetch({ limit: 100, before: pointer.id })
        .then(messagePage => {
          messages = new Map([...messages, ...messagePage])

          // Update our message pointer to be last message in page of messages
          if (capNumber.toLowerCase() !== "all" && messages.size >= parseInt(capNumber)) {
            pointer = null;
          } else if (startPost && startPost.createdTimestamp > messagePage.at(messagePage.size - 1)?.createdTimestamp) {
            pointer = null;
          } else if (endPost && endPost.createdTimestamp < messagePage.at(messagePage.size - 1)?.createdTimestamp) {
            pointer = null;
          } else if (messagePage.size > 0) {
            pointer = messagePage.at(messagePage.size - 1)
          } else {
            pointer = null;
          }
        })
    }
  }

  //Iterate through the messages here with the variable "messages".
  messages.forEach(message => {
    // skip posts before start time
    if (startPost && startPost.createdTimestamp > message.createdTimestamp) return;
    // skip posts after the end time
    if (endPost && endPost.createdTimestamp < message.createdTimestamp) return;
    // skip posts if there is no content, attachment or embeds
    if (!message.content && message.attachments.size <= 0 && message.embeds.length <= 0) return;

    const authorId = message.author.id;
    const guildmember = channel.guild.members.cache.get(authorId);

    let wc = 0;
    // if there's a user message
    if (message.content) {
      wc += message.content?.split(" ").filter(i => i !== '').length;
    }

    // if there's a bot embedded message
    const embedInfo = [];
    if (message.embeds.length > 0) {
      message.embeds.forEach(e => {
        if (message.interaction && message.interaction.commandName === "dice" && e.data.author) {
          wc += e.data.author.name?.split(" ").filter(i => i !== '').length
        }
        embedInfo.push({
          author: e.data.author,
          title: e.data.title,
          description: e.data.description,
          fields: e.data.fields ? e.data.fields : []
        })
      })
    }

    const totalpics = message.attachments.size;
    const isBot = message.author.bot;
    const displayname = guildmember?.nickname ? guildmember.nickname : message.author.username;
    const participantId = isBot ?  displayname : authorId;
    // save participant info
    if (participants[participantId]) {
      participants[participantId].wc += wc;
      participants[participantId].totalpics += totalpics;
    } else {
      participants[participantId] = {
        isBot: isBot,
        wc: wc,
        totalpics: totalpics,
        id: authorId,
        displayname: displayname,
        name: message.author.username + "#" + message.author.discriminator
      }
    }

    // save message info
    textlog.push({
      id: message.id,
      timestamp: message.createdTimestamp,
      text: message.content,
      attachments: message.attachments.map(i => i.url),
      reactions: message.reactions.cache.map(i => `(${i._emoji.name}, ${i.count})`).join(", "),
      authorId: authorId,
      authorDisplay: guildmember?.nickname ? guildmember.nickname : message.author.username,
      authorName: message.author.username + "#" + message.author.discriminator,
      embedInfo: embedInfo
    })
  })

  return {
    textlog,
    participants,
    messages
  }
}

// generates a log file of the given messages
function generateReport(channel, participants, textlog, messages, startPost, skipBot = false) {
  const participantStr = getParticipantString(participants);
  const description =
    (messages.size === 100 ? "!!!This is a log snippet capped at 100 messages, please enable `increasecap` if you want to see more messages.\n\n" : "")
    + "**Channel:** <#" + channel.id + ">"
    + `\n**Total messages**: ${textlog.length} (out of ${messages.size} parsed)`
    + `\n**Summary:** (WC: ${Object.values(participants).reduce((sum, a) => sum + a.wc, 0)},`
    + ` Files: ${Object.values(participants).reduce((sum, a) => sum + a.totalpics, 0)})`
    + `\n\n**Participants:** (${Object.keys(participants).length})`
    + "\n" + participantStr;
  const embed = new EmbedBuilder()
    .setThumbnail(client.user.displayAvatarURL())
    .setTitle("<:i_flower:885526297747521606>" + " Log Report")
    .setURL(`https://discord.com/channels/${channel.guild.id}/${channel.id}${startPost > 0 ? "/" + startPost : ""}`)
    .setDescription(description)
    .setColor('#67A4A6')
    .setTimestamp(new Date())

  let content =
    "================================================================================\n" +
    ` Summary of #${channel.name} (Time in CST)\n` +
    "================================================================================\n";

  content += `\nLog URL: https://discord.com/channels/${channel.guild.id}/${channel.id}${startPost > 0 ? "/" + startPost : ""}`;
  content += `\nTotal (non-empty) Messages: ${textlog.length} (out of ${messages.size} parsed)`
  content += `\nTotal Word Count: ${Object.values(participants).reduce((sum, a) => sum + a.wc, 0)}\nTotal Participants: ${Object.keys(participants).length}`;
  content += `\nParticipants:\n  - ${Object.values(participants).sort((a, b) => b.wc - a.wc).map(i => `${i.displayname} (WC: ${i.wc}, Files: ${i.totalpics})`).join("\n  - ")}`;
  content += "\n";

  textlog.sort((a, b) => a.timestamp - b.timestamp).forEach(i => {
    const currentDate = new Date(i.timestamp).toLocaleString('en-US', { timeZone: 'CST' });

    content += "\n---------------------------------------------\n";
    content += i.authorDisplay + " at " + currentDate + "\n\n";
    content += i.text + "\n";
    if (!skipBot) {
      i.embedInfo.forEach(e => {
        content += `${e.author ? e.author.name + "\n" : ""}${e.title ? e.title : ""}${e.description ? "\n" + e.description : ""}`;
        content += e.fields.map(f => `\n${f.name} || ${f.value}`)
      })
    }
    if (i.attachments.length > 0) content += "\nAttachments: " + i.attachments.join(", ");
    if (i.reactions) content += "\nReactions: " + i.reactions;
  })
  content += "\n---------------------------------------------\n";
  const file = new AttachmentBuilder(Buffer.from(content), { name: channel.name + '.txt' })
  return { embed, file };
}

function exportAsMarkdown(channel, participants, textlog) {
  let content =
    `# ${channel.name}\n\n` +
    `- Summary\n\n` +
    `    [Start](https://discord.com/channels/${channel.guild.id}/${channel.id}/${textlog[0].id}) → [End](https://discord.com/channels/${channel.guild.id}/${channel.id}/${textlog[textlog.length - 1].id})\n\n` +
    `    **Date:** ${new Date(textlog[0].timestamp).toLocaleString('en-US', { timeZone: 'CST' })} → ${new Date(textlog[textlog.length - 1].timestamp).toLocaleString('en-US', { timeZone: 'CST' })}\n\n` +
    `    **Total (non-empty) Messages:** ${textlog.length}\n\n` +
    `    **Word Count:** ${Object.values(participants).reduce((sum, a) => sum + a.wc, 0)}\n\n` +
    `    **Participants (${Object.keys(participants).length}):**\n\n`;

  Object.values(participants).sort((a, b) => b.wc - a.wc).forEach(p => {
    content += `    - ${p.displayname} (WC: ${p.wc}, Files: ${p.totalpics})\n`;
  });
  content += "\n"

  textlog.forEach(message => {
    content += `### ${message.authorDisplay}\n\n` +
      message.text + "\n\n";
    message.embedInfo.forEach(embed => {
      content += `${embed.author ? embed.author.name + "\n" : ""}${embed.title ? "**" + embed.title + "**\n" : ""}${embed.description ? embed.description + "\n" : ""}${embed.fields.map(f => ` - **${f.name}** ${f.value}`).join("\n")}\n\n`;
    })
    message.attachments.forEach(url => {
      if (url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) {
        content += `![${url}](${url})\n\n`;
      } else {
        content += `[${url}](${url})\n\n`;
      }
    })
  })
  const file = new AttachmentBuilder(Buffer.from(content), { name: channel.name + '.md' })
  return file;
}

module.exports = {
  parseMessages: parseMessages,
  generateReport: generateReport,
  exportAsMarkdown: exportAsMarkdown
}