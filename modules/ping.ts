import { Client, Events, GuildMember, MessageType, TextChannel } from "discord.js";

export default function (client: Client) {
  client.on(Events.MessageCreate, async message => {
    if (!message.guild?.channels) return;
    if (message.author.bot) return;
    if (!message?.content?.startsWith(">ping")) return;
    const MESSAGE_LINK_REGEX = new RegExp(`(https?:\/\/)?(www.)?(discord(app)?.com\/channels)+\/${message.guildId}\/+\\d+\/+\\d+`, "g")

    let users = [] as string[];

    // if reply
    if (message.type === MessageType.Reply && message.reference?.messageId) {
      const post = await message.channel.messages.fetch(message.reference.messageId);
      const mentionedUsers = Array.from(post.mentions.members!.values()) as GuildMember[];
      users = [...users, ...mentionedUsers.map((i) => i.id)];
    } else {
      const preview = [...message?.content.matchAll(MESSAGE_LINK_REGEX)];
      const split = message.content.split(" ");
      const emoji = split.length === 3 ? split.at(-1)?.trim() : null;
      for (let i in preview) {
        try {
          const link = preview[i][0].split("/");
          const channelId = link.at(-2);
          const messageId = link.at(-1);
          const channel = message.guild.channels.cache.get(channelId!) as TextChannel;
          const post = await channel.messages.fetch(messageId!);

          const mentionedUsers = Array.from(post.mentions.members.values()) as GuildMember[];
          users = [...users, ...mentionedUsers.map((i) => i.id)];

          for (const reaction of post.reactions.cache.values()) {
            if (!emoji || emoji.includes(reaction.emoji.name!)) {
              let reactedUsers = await reaction.users.fetch();
              users = [...users, ...reactedUsers.map((i) => i.id)]
            }
          }
        } catch (e) {
          console.log("Could not ping from post: " + e);
        }
      }
    }

    if (users.length > 0) {
      await message.channel.send({ content: [...new Set(users)].map(id => `<@${id}>`).join(" ") });
    }
  });
}
