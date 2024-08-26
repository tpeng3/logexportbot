const { EmbedBuilder, Events, MessageType } = require("discord.js");

module.exports = function (client) {
  client.on(Events.MessageCreate, async (message) => {
    let args = message.content.split(" ");
    const command = args[0];
    args.shift();
    if (command === ">embed") {
      const link = args[0].split("/");
      const channelId = link.at(-2);
      const messageId = link.at(-1);
      const channel = message.guild.channels.cache.get(channelId);
      if (!channel) return rError(message, "Error: Please provide a Discord link to embed.");
      const post = await channel.messages.fetch(messageId);
      if (!post) return rError(message, "Error: Couldn't find a valid Discord message to embed.");

      try {
        const embed = new EmbedBuilder().setColor("#67A4A6");
        const fields = post.content.split("\n");
        let author, authorpic;
        for (let i in fields) {
          if (fields[i].includes("AuthorPic:")) {
            authorpic = fields[i].replace(/\*|<|>|AuthorPic:|AuthorPic: |/g, "").trim();
          } else if (fields[i].includes("Author:")) {
            author = fields[i].replace(/\*|\_|Author:|Author: |/g, "").trim();
          } else if (fields[i].includes("Title:")) {
            const title = fields[i].replace(/\*|Title:|Title: /g, "").trim();
            if (title) embed.setTitle(title);
          } else if (fields[i].includes("Thumbnail:")) {
            const thumbnail = fields[i].replace(/\*|<|>|Thumbnail:|Thumbnail: /g, "").trim();
            if (thumbnail) embed.setThumbnail(thumbnail);
          } else if (fields[i].includes("Image:")) {
            const image = fields[i].replace(/\*|<|>|Image:|Image: /g, "").trim();
            if (image) embed.setImage(image);
          } else if (fields[i].includes("Color:")) {
            const color = fields[i].replace(/\*|<|>|Color:|Color: /g, "").trim();
            if (color) embed.setColor(color);
          }
        }

        if (author && authorpic) {
          embed.setAuthor({ name: author, iconURL: authorpic });
        } else if (author) {
          embed.setAuthor({ name: author });
        }

        if (post.content.includes("**Description:**")) {
          const description = post.content.split("**Description:**").at(1);
          if (description) embed.setDescription(description.trim());
        }

        message.delete();
        if (message.type === MessageType.Reply && message.reference?.messageId) {
          await message.channel.send({
            embeds: [embed],
            reply: { messageReference: message.reference.messageId },
          });
        } else {
          await message.channel.send({ embeds: [embed] });
        }
      } catch (e) {
        await rError(message, "There was an error formatting the embed:\n" + e);
      }
    } else if (command === ">ping") {
      const MESSAGE_LINK_REGEX = new RegExp(
        `(https?:\/\/)?(www.)?(discord(app)?.com\/channels)+\/${message.guild.id}\/+\\d+\/+\\d+`,
        "g"
      );
      if (!message.guild?.channels) return;

      const preview = [...message?.content.matchAll(MESSAGE_LINK_REGEX)];
      const split = message.content.split(" ");
      const emoji = split.length === 3 ? split.at(-1)?.trim() : null;
      let users = [];
      for (let i in preview) {
        try {
          const link = preview[i][0].split("/");
          const channelId = link.at(-2);
          const messageId = link.at(-1);
          const channel = message.guild.channels.cache.get(channelId);
          const post = await channel.messages.fetch(messageId);
          for (const reaction of post.reactions.cache.values()) {
            if (!emoji || reaction.emoji.name === emoji || emoji.includes(reaction.emoji.id)) {
              let reactedUsers = await reaction.users.fetch();
              users = [...users, ...reactedUsers.map((i) => i.id)];
            }
          }
        } catch (e) {
          console.log("Could not ping from post: " + e);
        }
      }

      if (users.length > 0) {
        await message.channel.send({
          content: [...new Set(users)].map((id) => `<@${id}>`).join(" "),
        });
      }
    }
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }

    if (reaction.emoji.name === "❌") {
      // only delete bot messages that you or the bot created
      if (
        (!reaction.message.interaction && client.application.id === reaction.message.author.id) ||
        (client.application.id === reaction.message.author.id &&
          reaction.message.interaction.user.id === user.id)
      ) {
        reaction.message.delete();
      }
    }
  });
};

function rError(message, msg) {
  message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#f0ac97")
        .setDescription(msg + "\n\n(React with ❌ to delete this message.)"),
    ],
  });
}
