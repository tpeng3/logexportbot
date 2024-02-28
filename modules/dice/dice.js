const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = function () {
  setupCommands(client);
  handleCommands(client);
}

function setupCommands(client) {
  const diceCommand = new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a d-something dice.')
    .addStringOption(option =>
      option.setName('expression')
        .setDescription("dice expression, e.g. '2d6' or '2d6+3")
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription("(optional) text for what the roll is for")
        .setMaxLength(225)
        .setRequired(false))

  const chooseCommand = new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose a random option out of a given list')
    .addStringOption(option =>
      option.setName('choices')
        .setDescription("seperated by | (ex: milk|soda|water)")
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription("(optional) text for what the choice is for")
        .setMaxLength(225)
        .setRequired(false))

  client.commands.push(diceCommand);
  client.commands.push(chooseCommand);
}

function handleCommands(client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'dice') {
      const expr = interaction.options.getString('expression');
      const desc = interaction.options.getString('description');
      const dice = expr.split("d");
      if (dice.length !== 2) return replyError(interaction, `Sorry, ${expr} is not a valid dice expression.`);

      let sum = 0;
      let amount = dice[0] === "" ? 1 : parseInt(dice[0]);
      let range = parseInt(dice[1]);

      let modifier = null;
      const OPERATIONS = ['+', '-', '/', '*'];
      for (let i in OPERATIONS) {
        if (dice.at(-1).includes(OPERATIONS[i])) {
          const hack = dice.at(-1).split(OPERATIONS[i]);
          modifier = OPERATIONS[i] + hack.at(-1);
          range = parseInt(hack[0]);
          break;
        }
      }

      if (!amount || amount > 999 || amount < 1) return replyError(interaction, `Invalid number of rolls (has to be 1-999)`);
      if (!range || range > 999 || range < 1) return replyError(interaction, `Invalid range for dice (has to be 1-999)`);

      const results = [];
      for (let i = 0; i < amount; i++) {
        const res = rollDice(range);
        results.push(res);
        sum += res;
      }

      let modifierStr = "";
      if (modifier) {
        const number = parseInt(modifier.slice(1));
        if (isNaN(number)) {
          return replyError(interaction, `Sorry, the modifier ${modifier} needs to have a valid number`);
        }
        if (modifier.startsWith("-")) {
          sum -= number;
        } else if (modifier.startsWith("*")) {
          sum *= number;
        } else if (modifier.startsWith("/")) {
          sum /= number;
        } else if (modifier.startsWith("+")) {
          sum += number;
        } else {
          return replyError(interaction, `Sorry, the modifier ${modifier} needs to be a valid math expression.`);
        }
        modifierStr = ` [${modifier}]`
      }

      const embed = new EmbedBuilder()
        .setColor('#67A4A6')
        .setTitle(amount + "d" + range + modifierStr + " = " + sum)
        .setDescription("[ " + results.join(", ") + " ]" + modifierStr)
        .setFooter({ text: "Hotato Bot", iconURL: client.user.displayAvatarURL() });
      if (desc) {
        embed.setAuthor({name: "Rolling for " + desc, iconURL: interaction.user.displayAvatarURL()})
      }
      await interaction.reply({ embeds: [embed] });
    } else if (interaction.commandName === 'choose') {
      const expr = interaction.options.getString('choices');
      const desc = interaction.options.getString('description');
      const choices = expr.split("|");
      const pick = rollDice(choices.length);
      const embed = new EmbedBuilder()
        .setColor('#67A4A6')
        .setTitle(`Selected: ` + choices[pick - 1].trim().toUpperCase())
        .setDescription("[ " + choices.map(i => i.trim()).join(", ") + " ]")
        .setFooter({ text: "Hotato Bot", iconURL: client.user.displayAvatarURL() });
      if (desc) {
        embed.setAuthor({name: "Choosing " + desc, iconURL: interaction.user.displayAvatarURL()})
      }
      await interaction.reply({ embeds: [embed] });
    }
  });
}

// random algorithm
global.rollDice = (max) => {
  if (isNaN(max)) return 0;
  const min = 1; // we can change this later if people want to roll in a more specific range
  const res = (Math.floor(Math.pow(10, 14) * Math.random() * Math.random()) % (max - min + 1)) + min;
  return res;
}