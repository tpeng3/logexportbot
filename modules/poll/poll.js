const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const NUMBER_EMOJIS = {
  0: "0️⃣",
  1: "1️⃣",
  2: "2️⃣",
  3: "3️⃣",
  4: "4️⃣",
  5: "5️⃣",
  6: "6️⃣",
  7: "7️⃣",
  8: "8️⃣",
  9: "9️⃣",
  10: "🔟",
};
const POLLS = {};

module.exports = function () {
  setupCommands(client);
  handleCommands(client);
};

function setupCommands(client) {
  const pollCommand = new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Hold a poll for a given list of options")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription(`Question or topic for the poll (ex: best animal)`)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("choices")
        .setDescription(`separated by | (ex: duck|frog|fish)`)
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("incognito")
        .setDescription(`Shares the poll results only to your DMs`)
        .setRequired(false)
    );

  client.commands.push(pollCommand);
}

function handleCommands(client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "poll") {
      const title = interaction.options.getString("topic");
      const choiceString = interaction.options.getString("choices");
      const incognito = interaction.options.getBoolean("incognito");
      const choices = choiceString.split("|").map((i) => i.trim());
      if (choices.length < 1 || choices.length > 5) {
        return replyError(interaction, "Sorry, polls are limited to 5 choices max.");
      }
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Let's vote!${incognito ? " (Anonymous)" : ""}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle(title.toUpperCase())
        .setColor("#67A4A6")
        .setFooter({ text: "Hotato Bot", iconURL: client.user.displayAvatarURL() })
        .addFields({ name: "Users voted", value: `0` });
      const buttons = [];
      let description = "";
      const pollConfig = {
        users: {},
        choices: {},
        isIncognito: incognito,
      };
      choices.forEach((choice, i) => {
        description += `${NUMBER_EMOJIS[i + 1]} ${choice}\n`;
        pollConfig.choices[i] = choice;
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`poll|${slugify(title)}|${i}`)
            .setEmoji(NUMBER_EMOJIS[i + 1])
            .setStyle(ButtonStyle.Secondary)
        );
      });
      POLLS[slugify(title)] = pollConfig;
      embed.setDescription(description);
      const endRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`poll|${slugify(title)}|end`)
          .setLabel("End Poll")
          .setStyle(ButtonStyle.Secondary)
      );
      const row = new ActionRowBuilder().addComponents(buttons);
      const message = await interaction.reply({
        embeds: [embed],
        components: [row, endRow],
        fetchReply: true,
      });
      const collector = message.createMessageComponentCollector({});
      collector.on("collect", async (i) => {
        const [_, pollKey, choiceKey] = i.customId.split("|");
        if (choiceKey === "end") {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: `Sorry, only the original poster can end the poll.`,
              ephemeral: true,
            });
          }
          collector.stop();
          const max = Object.keys(POLLS[pollKey].users).length;

          const generatePollString = (amount = 0) =>
            `[${"o".repeat(amount) + "-".repeat(max - amount)}] (${Math.floor(
              (amount / max) * 100
            )}%)`;

          const updatedEmbed = EmbedBuilder.from(interaction.message);
          updatedEmbed
            .setAuthor({ name: "Poll Results", iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`Total votes: ${Object.keys(POLLS[pollKey].users).length}`);

          Object.values(POLLS[pollKey].choices).forEach((choice, i) => {
            const users = Object.keys(POLLS[pollKey].users).filter(
              (c) => parseInt(POLLS[pollKey].users[c]) === i
            );
            let description =
              generatePollString(users.length) + "\n" + users.map((u) => `<@${u}>`).join(" ");
            updatedEmbed.addFields({
              name: `${NUMBER_EMOJIS[i + 1]} ${choice}`,
              value: description,
            });
          });
          if (POLLS[pollKey].isIncognito) {
            i.user.send({ embeds: [updatedEmbed] });
            i.update({
              embeds: [
                EmbedBuilder.from(i.message.embeds[0]).setDescription(
                  `Poll has ended and the results have been DMed to ${interaction.user}!`
                ),
              ],
              components: [],
            });
          } else {
            i.update({ embeds: [updatedEmbed], components: [] });
          }
        } else if (POLLS[pollKey]) {
          const poll = POLLS[pollKey];
          if (poll.users[i.user.id]) {
            if (poll.users[i.user.id] === choiceKey) {
              i.reply({
                content: `You have already voted for \`${poll.choices[choiceKey]}\`! Click another button to change your vote before the poll ends.`,
                ephemeral: true,
              });
            } else {
              POLLS[pollKey].users[i.user.id] = choiceKey;
              i.reply({
                content: `You have changed your voted to \`${poll.choices[choiceKey]}\`!`,
                ephemeral: true,
              });
            }
          } else {
            const updatedEmbed = EmbedBuilder.from(i.message.embeds[0]);
            POLLS[pollKey].users[i.user.id] = choiceKey;
            updatedEmbed.setFields({
              name: "Users voted",
              value: `${Object.keys(poll.users).length}`,
            });
            message.edit({ embeds: [updatedEmbed] });
            i.reply({
              content: `You have voted for \`${poll.choices[choiceKey]}\`!`,
              ephemeral: true,
            });
          }
        } else {
          i.reply({ content: `Sorry, the poll is no longer active.`, ephemeral: true });
        }
      });
    }
  });
}

// convert given text to a key-friendly string
const slugify = (text = "") => {
  if (!text) return "";
  return text
    .toString() // Cast to string (optional)
    .normalize("NFKD") // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
    .toLowerCase() // Convert the string to lowercase letters
    .trim() // Remove whitespace from both sides of a string (optional)
    .replace(/\s+/g, "") // Remove spaces
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "") // Remove multiple
    .replace(/_/g, ""); // Remove all underscores
};
