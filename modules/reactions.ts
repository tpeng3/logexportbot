import { ButtonBuilder, ButtonStyle, Client, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, Message, MessageFlags, MessageReaction, MessageType, SectionBuilder, SeparatorSpacingSize, TextChannel, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { COLORS, hexToRgb } from "./global.ts";

export const CHANNEL_CACHE: { [guildId: string]: { star: string, starCount: number, art: string, artCount: number } } = {};

export default function (client: Client) {
  client.on("messageReactionAdd", async (r, user) => {
    // When a reaction is received, check if the structure is partial
    if (r.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await r.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }
    const reaction = r as MessageReaction;
    if (user.bot) return;

    if (reaction.emoji.name === "❌") {
      await recallMessage(client, reaction, user.id);
    } else if (reaction.emoji.name === "⭐") {
      await forwardToStarboard(reaction);
    } else if (reaction.emoji.name === "🎨") {
      await forwardToArtboard(reaction);
    }
  });
}

function recallMessage(client, reaction: MessageReaction, userId: string) {
  // only delete bot messages that you or the bot created
  if (
    client.user.id === reaction.message.author!.id ||
    (reaction.message?.interactionMetadata?.user.id === userId)
  ) {
    reaction.message.delete();
  }
}

async function forwardToStarboard(reaction: MessageReaction) {
  // check if there's an existing starboard channel set
  let starboardInfo = CHANNEL_CACHE[reaction.message.guildId];
  if (!starboardInfo || !starboardInfo.star) {
    starboardInfo = await db.get(`settings.${reaction.message.guildId}`);
    if (!starboardInfo || !starboardInfo.star) return;
    CHANNEL_CACHE[reaction.message.guildId] = starboardInfo;
  }

  // if starboard count is at 0, it's turned off
  if (starboardInfo.starCount <= 0) return;

  // send starred messages to the star board
  const post = reaction.message as Message;
  const starCount = starboardInfo.starCount || 2;

  // if the post has already been sent, don't send again
  for (const key of post.reactions.cache.keys()) {
    // if (key === "⭐" && post.reactions.cache.get(key)!.count === 2) {
    //   console.log(user.globalName + " just starred " + post.url);
    // }
    if (key === "⭐" && (post.reactions.cache.get(key)!.count !== starCount)) {
      return;
    }
    if (key === "✅") {
      return;
    }
  }

  const container = new ContainerBuilder()
    .setAccentColor(hexToRgb(COLORS.default))

  function addMsgSection(msg: Message) {
    let author = msg.author.bot ? msg.author.displayName : `<@${msg.author.id}>`
    const content = msg.content.length > 4000 ? msg.content.slice(0, 4000) + "..." : msg.content
    let thumbnail = msg.member ? msg.member.displayAvatarURL() : msg.author.displayAvatarURL();

    if (post.embeds.length > 0) {
      if (post.embeds[0].author) {
        author = post.embeds[0].author.name;
        thumbnail = post.embeds[0].author.iconURL;
      }
      if (post.embeds[0].thumbnail) {
        thumbnail = post.embeds[0].thumbnail.url;
      }
    }

    container.addSectionComponents(new SectionBuilder()
      .setThumbnailAccessory(
        new ThumbnailBuilder().setURL(thumbnail)
      )
      .addTextDisplayComponents(
        [new TextDisplayBuilder().setContent(`**${author}**`),
        content && new TextDisplayBuilder().setContent(content)].filter(b => b)
      )
    )

    if (post.embeds.length > 0) {
      container.addTextDisplayComponents(
        [post.embeds[0].title && new TextDisplayBuilder().setContent(post.embeds[0].title),
        post.embeds[0].description && new TextDisplayBuilder().setContent(post.embeds[0].description)].filter(b => b)
      )
    }

    if (msg.attachments.size > 0) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder()
          .addItems(
            msg.attachments.map((attachment) => {
              return new MediaGalleryItemBuilder()
                .setURL(attachment.url)
                .setSpoiler(attachment.spoiler)
            })
          )
      )
    }
  }

  if (post.type === MessageType.Reply && post.reference?.messageId) {
    const reply = await post.channel.messages.fetch(post.reference.messageId);
    addMsgSection(reply);
    container.addSeparatorComponents(seperator => seperator.setSpacing(SeparatorSpacingSize.Large));
  }

  addMsgSection(post);

  // add footer
  container.addSeparatorComponents(seperator => seperator.setSpacing(SeparatorSpacingSize.Small))
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Message Preview")
            .setURL(post.url)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# #${(post.channel as TextChannel).name} | <t:${Math.floor(post.createdTimestamp / 1000)}:R>`),
        )
    )

  let starboard = post.guild!.channels.cache.get(starboardInfo.star) as TextChannel;
  if (!starboard) {
    starboard = await post.guild.channels.fetch(starboardInfo.star) as TextChannel;
  }
  if (starboard) {
    post.react("✅");
    starboard.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
  }
}

async function forwardToArtboard(reaction: MessageReaction) {
  // check if there's an existing artboard channel set
  let starboardInfo = CHANNEL_CACHE[reaction.message.guildId];
  if (!starboardInfo || !starboardInfo.art) {
    starboardInfo = await db.get(`settings.${reaction.message.guildId}`);
    if (!starboardInfo || !starboardInfo.art) return;
    CHANNEL_CACHE[reaction.message.guildId] = starboardInfo;
  }

  // send art messages to the art channel
  const post = reaction.message as Message;
  const artCount = starboardInfo.artCount || 1;

  // if starboard count is at 0, it's turned off
  if (starboardInfo.artCount <= 0) return;

  // if the post has already been sent, don't send again
  for (const key of post.reactions.cache.keys()) {
    if (key === "⭐" && (post.reactions.cache.get(key)!.count !== artCount)) {
      return;
    }
  }

  const artboard = post.guild!.channels.cache.get(starboardInfo.art) as TextChannel;
  if (!artboard) {
    await post.guild.channels.fetch(starboardInfo.art) as TextChannel;
  }
  if (artboard) {
    post.react("✅");
    artboard.send({
      content:
        `-# Art by <@${post.author.id}>`,
      allowedMentions: { parse: [] }
    });
    await post.forward(artboard);
  }
}