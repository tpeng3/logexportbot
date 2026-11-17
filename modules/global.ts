import { AttachmentBuilder, type ColorResolvable, EmbedBuilder, type Interaction, MessageFlags, type RGBTuple } from "discord.js";

export const COLORS: { [key: string]: ColorResolvable } = {
  default: '#67A4A6',
  error: '#3f0ac97'
}

export const hexToRgb = (hex): RGBTuple => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

export const getInteractionAvatar = (interaction: any) => {
  return interaction.member?.displayAvatarURL() ?? interaction.user.displayAvatarURL();
}

interface ReplyOptions {
  title?: string;
  thumbnail?: string;
  image?: string;
  file?: AttachmentBuilder;
  ephemeral?: boolean;
  updateReply?: boolean;
  newMessage?: boolean;
  content?: string;
}
export const reply = async (
  interaction: any,
  msg: string,
  color = COLORS.default,
  {
    title = "",
    thumbnail = undefined,
    image = undefined,
    file = undefined,
    ephemeral = false,
    updateReply = false,
    newMessage = false,
    content = "" }: ReplyOptions = {}
) => {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(msg)

  if (title) embed.setTitle(title);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (file) embed.setImage(`attachment://${file.name}`);
  else if (image) embed.setImage(image);

  const flags = [];
  if (ephemeral) flags.push(MessageFlags.Ephemeral);

  if (newMessage) {
    await interaction.deleteReply();
    await interaction.channel.send({
      embeds: [embed],
      files: file ? [file] : [],
      components: [],
      flags,
      ...(content ? { content: content } : {}),
    });
  } else if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      embeds: [embed],
      files: file ? [file] : [],
      components: [],
      flags,
      ...(content ? { content: content } : {}),
    });
  } else if (updateReply) {
    await interaction.update({
      embeds: [embed],
      files: file ? [file] : [],
      components: [],
      flags,
      ...(content ? { content: content } : {}),
    });
  } else {
    await interaction.reply({
      embeds: [embed],
      files: file ? [file] : [],
      components: [],
      flags,
      ...(content ? { content: content } : {}),
    });
  }
};

export const replyError = async (interaction: Interaction, msg: string, options = {}) => {
  await reply(interaction, msg, COLORS.error, options);
}

export const replySuccess = async (interaction: Interaction, msg: string, options = {}) => {
  await reply(interaction, msg, COLORS.default, options);
}

export const rError = async (message: any, msg: string) => {
  const embed = new EmbedBuilder().setColor(COLORS.default).setDescription(msg);
  return await message.channel!.send({ embeds: [embed] });
};