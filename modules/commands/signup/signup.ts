import {
  SlashCommandBuilder,
  EmbedBuilder,
  ReactionCollector,
  ChatInputCommandInteraction,
} from "discord.js";
import { COLORS, getInteractionAvatar, replyError } from "../../global.ts";

const ALPHA_EMOJIS: { [key: number]: string } = {
  1: '🇦',
  2: '🇧',
  3: '🇨',
  4: '🇩',
  5: '🇪',
  6: '🇫',
  7: '🇬',
  8: '🇭',
  9: '🇮',
  10: '🇯',
  11: '🇰',
  12: '🇱',
  13: '🇲',
  14: '🇳',
  15: '🇴',
  16: '🇵',
  17: '🇶',
  18: '🇷',
  19: '🇸',
  20: '🇹',
  21: '🇺',
  22: '🇻',
  23: '🇼',
  24: '🇽',
  25: '🇾',
  26: '🇿'
}

export default {
  data: new SlashCommandBuilder()
    .setName("signup")
    .setDescription("Create a form to track user interest in an event")
    .addStringOption((option) =>
      option.setName("name").setDescription(`Name of the signup sheet or event`).setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("groups")
        .setDescription(`separated by | (ex: 1️⃣Group 1|2️⃣Group 2|3️⃣Group 3)`)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription(`Optional description to the form`)
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("name")!;
    const choiceString = interaction.options.getString("groups")!;
    const description = interaction.options.getString("description");
    const choices = choiceString.split("|").map((i) => i.trim());
    if (choices.length < 1 || choices.length > 23) {
      return replyError(interaction, "Sorry, number of groups are limited from 1 to 23.");
    }
    const embed = new EmbedBuilder()
      .setAuthor({ name: "React to sign up!", iconURL: getInteractionAvatar(interaction) })
      .setTitle(title.toUpperCase())
      .setColor(COLORS.default)
    if (description) embed.setDescription(description);
    const emojis = [] as string[];
    const emojiRegex = /<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu;
    choices.forEach((choice, i) => {
      let name = choice;
      if (choice.startsWith("<:")) {
        const emoji = choice.split(">")[0];
        emojis.push(`${emoji}>`);
      } else if (emojiRegex.test(choice)) {
        const emoji = choice.match(emojiRegex)![0];
        emojis.push(`${emoji}`);
      } else {
        const emoji = ALPHA_EMOJIS[i + 1];
        emojis.push(emoji);
        name = `${emoji} ${choice}`;
      }
      embed.addFields({ name: name, value: `No users yet.`, inline: true });
    });
    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    try {
      for (let i = 0; i < emojis.length; i++) {
        await message.react(emojis[i]);
      }
    } catch (error) {
      console.log(error);
    }

    const collector = new ReactionCollector(message, { dispose: true });
    collector.on("remove", async (reaction, user) => {
      const updatedEmbed = EmbedBuilder.from(reaction.message.embeds[0]) as any;
      for (const r of reaction.message.reactions.cache.values()) {
        const field = updatedEmbed.data!.fields!.find((f: any) => f.name.includes(r.emoji.name));
        if (field) {
          const reactedUsers = await r.users.fetch();
          field.value =
            reactedUsers.size > 1
              ? Array.from(reactedUsers)
                .filter((u: any) => u[0] !== client.user!.id)
                .map((u: any, i) => `${i + 1}. <@${u[0]}>`)
                .join("\n")
              : "No users yet.";
        }
      }
      await reaction.message.edit({ embeds: [updatedEmbed] });
    });
    collector.on("collect", async (reaction, user) => {
      const updatedEmbed = EmbedBuilder.from(reaction.message.embeds[0]) as any;
      for (const r of reaction.message.reactions.cache.values()) {
        const field = updatedEmbed.data!.fields!.find((f: any) => f.name.includes(r.emoji.name));
        if (field) {
          const reactedUsers = await r.users.fetch();
          field.value =
            reactedUsers.size > 1
              ? Array.from(reactedUsers)
                .filter((u: any) => u[0] !== client.user!.id)
                .map((u: any, i) => `${i + 1}. <@${u[0]}>`)
                .join("\n")
              : "No users yet.";
        }
      }
      await reaction.message.edit({ embeds: [updatedEmbed] });
    });
  },
};
