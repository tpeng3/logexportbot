// generate participant string
function getParticipantString(participants) {
  return Object.values(participants)
    .sort((a, b) => b.wc - a.wc)
    .map(i => `<@${i.id}> (WC: ${i.wc}, Files: ${i.totalpics})`)
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
    // skip empty messages and bots
    if (message.author.id === client.user.id) return;

    // skip posts before start time
    if (startPost && startPost.createdTimestamp > message.createdTimestamp) return;

    // skip posts after the end time
    if (endPost && endPost.createdTimestamp < message.createdTimestamp) return;

    const authorId = message.author.id;
    const wc = message.content.split(" ").filter(i => i !== '').length;
    const totalpics = message.attachments.size;
    // save participant info
    if (participants[authorId]) {
      participants[authorId].wc += wc;
      participants[authorId].totalpics += totalpics;
    } else {
      participants[authorId] = {
        wc: wc ? wc : 0,
        totalpics: totalpics,
        id: authorId,
        name: message.author.username + "#" + message.author.discriminator
      }
    }
    // save message info
    textlog.push({
      timestamp: message.createdTimestamp,
      text: message.content,
      attachments: message.attachments.map(i => i.url).join(", "),
      reactions: message.reactions.cache.map(i => `(${i._emoji.name}, ${i.count})`).join(", "),
      authorId: authorId,
      authorName: message.author.username + "#" + message.author.discriminator
    })
  })

  return {
    textlog,
    participants,
    messages
  }
}

// generates a log file of the given messages
function generateReport(channel, participants, textlog, messages, startPost) {
  const participantStr = getParticipantString(participants);
  const description =
    (messages.size === 100 ? "!!!This is a log snippet capped at 100 messages, please enable `increasecap` if you want to see more messages.\n\n" : "")
    + "**Channel:** <#" + channel.id + ">"
    + `\n**Total messages**: ${textlog.length} (out of ${messages.size} parsed)`
    + `\n**Summary:** (WC: ${Object.values(participants).reduce((sum, a) => sum + a.wc, 0)},`
    + ` Files: ${Object.values(participants).reduce((sum, a) => sum + a.totalpics, 0)})`
    + `\n\n**Participants:** (${Object.keys(participants).length})`
    + "\n" + participantStr;
  const embed = new Discord.MessageEmbed()
    .setThumbnail(client.user.displayAvatarURL())
    .setTitle("<:i_flower:885526297747521606>" + " Log Report")
    .setURL(`https://discord.com/channels/${config.guildID}/${channel.id}${startPost > 0 ? "/" + startPost : ""}`)
    .setDescription(description)
    .setTimestamp(new Date())

  let content =
    "================================================================================\n" +
    ` Summary of #${channel.name} (Time in CST)\n` +
    "================================================================================\n";

  content += `\nLog URL: https://discord.com/channels/${config.guildID}/${channel.id}${startPost > 0 ? "/" + startPost : ""}`;
  content += `\nTotal (non-empty) Messages: ${textlog.length} (out of ${messages.size} parsed)`
  content += `\nTotal Word Count: ${Object.values(participants).reduce((sum, a) => sum + a.wc, 0)}\nTotal Participants: ${Object.keys(participants).length}`;
  content += `\nParticipants:\n  - ${Object.values(participants).sort((a, b) => b.wc - a.wc).map(i => `${i.name} (WC: ${i.wc}, Files: ${i.totalpics})`).join("\n  - ")}`;
  content += "\n";

  textlog.sort((a, b) => a.timestamp - b.timestamp).forEach(i => {
    const currentDate = new Date(i.timestamp).toLocaleString('en-US', { timeZone: 'CST' });

    content += "\n---------------------------------------------\n";
    content += i.authorName + " at " + currentDate + "\n\n";
    if (i.text) content += i.text + "\n";
    if (i.attachments) content += "\nAttachments: " + i.attachments;
    if (i.reactions) content += "\nReactions: " + i.reactions;
  })
  content += "\n---------------------------------------------\n";
  const file = new Discord.MessageAttachment(Buffer.from(content), 'report.txt')
  return { embed, file };
}

module.exports = {
  parseMessages: parseMessages,
  generateReport: generateReport,
}