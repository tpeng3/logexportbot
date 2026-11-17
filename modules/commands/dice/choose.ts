import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { COLORS } from "../../global.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Choose a random option")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("coin")
        .setDescription("Flip a coin with the outcome heads or tails")
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("(optional) text for what the coin flip is for")
            .setMaxLength(225)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("(optional) amount of times to flip the coin (default: 1)")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("range")
        .setDescription("Choose a random option out of a given list")
        .addStringOption((option) =>
          option
            .setName("choices")
            .setDescription("separated by | (ex: milk|soda|water)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("(optional) text for what the choice is for")
            .setMaxLength(225)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("(optional) number of rerolls on the choices (default: 1)")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("unique")
            .setDescription("If amount is set, makes sure outcomes are unique (default: false)")
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.default)

    const desc = interaction.options.getString("description");
    if (desc) {
      embed.setAuthor({ name: "Choosing " + desc, iconURL: interaction.member.displayAvatarURL() });
    }

    const amount = interaction.options.getInteger("amount") ?? 1;

    if (interaction.options.getSubcommand() === "coin") {
      const heads =
        "https://cdn.discordapp.com/attachments/1052336540610732113/1108110773928087682/quingheads.gif";
      const tails =
        "https://cdn.discordapp.com/attachments/1052336540610732113/1108110773546385509/quingtails.gif";

      function toss() {
        const isHeads = Math.random() >= 0.5;
        return isHeads ? "HEADS" : "TAILS";
      }

      if (amount > 1) {
        const results = [] as string[];
        for (let i = 0; i < amount; i++) {
          results.push(toss());
        }
        embed
          .setTitle(`Toss ${amount} times`)
          .setThumbnail(results[0] === "HEADS" ? heads : tails)
          .setDescription("[ heads, tails ]" + "\n\n1. " + results.join("\n1. "));
      } else {
        const result = toss();
        embed
          .setTitle(`Selected: ` + result)
          .setThumbnail(result === "HEADS" ? heads : tails)
          .setDescription("[ heads, tails ]");
      }
    } else if (interaction.options.getSubcommand() === "range") {
      const expr = interaction.options.getString("choices");
      const choices = expr.split("|").map((i) => i.trim());
      let options = [...choices];
      const isUnique = interaction.options.getBoolean("unique") ?? false;

      function pick() {
        const pick = rollDice(options.length);
        const p = options[pick - 1] ?? "None";
        options = isUnique ? options.filter((i) => i != p) : options;
        return p;
      }

      if (amount > 1) {
        const results = [] as string[];
        for (let i = 0; i < amount; i++) {
          results.push(pick());
        }
        embed
          .setTitle(`Choose ${amount} times ${isUnique ? "(unique)" : ""}`)
          .setDescription(
            "[ " +
            choices.join(", ") +
            " ]" +
            "\n\n1. " +
            results.join("\n1. ")
          );
      } else {
        const result = pick();
        embed
          .setTitle(`Selected: ` + result.toUpperCase())
          .setDescription("[ " + choices.join(", ") + " ]");
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};

const rollDice = (max: number) => {
  if (isNaN(max)) return 0;
  const min = 1; // we can change this later if people want to roll in a more specific range
  const res = (Math.floor(Math.pow(10, 14) * Math.random() * Math.random()) % (max - min + 1)) + min;
  return res;
}