import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { evaluate } from 'mathjs';
import { COLORS, replyError } from '../../global.ts';
export default {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll a d-something dice.')
        .addStringOption(option => option.setName('expression')
        .setDescription("dice expression, e.g. '1d20' or '2d6+3")
        .setRequired(true))
        .addStringOption(option => option.setName('description')
        .setDescription("(optional) text for what the roll is for")
        .setMaxLength(225)
        .setRequired(false)),
    async execute(interaction) {
        const expr = interaction.options.getString('expression');
        const desc = interaction.options.getString('description');
        try {
            const roll = new DiceRoll(expr);
            const output = roll.output.split("=")[0].trim();
            const embed = new EmbedBuilder()
                .setColor(COLORS.default);
            if (desc) {
                embed.setAuthor({ name: "Rolling for " + desc, iconURL: interaction.member.displayAvatarURL() });
            }
            // check for special roll format (dX + Y)
            if (roll.rolls.length === 3 &&
                typeof roll.rolls[0] === "object" &&
                typeof roll.rolls[1] === "string" &&
                typeof roll.rolls[2] === "number") {
                const rollResults = roll.rolls[0].rolls;
                const results = [];
                const modResults = [];
                for (let i = 0; i < rollResults.length; i++) {
                    const r = rollResults[i];
                    results.push(r.value);
                    if (r.useInTotal) {
                        const math = evaluate(`${r.value} ${roll.rolls[1]} ${roll.rolls[2]}`);
                        modResults.push(math);
                    }
                }
                embed.setTitle(`🎲 ${modResults.join(", ")}`)
                    .setDescription(`-# ${output}\n` +
                    `-# Sum (single-mod): **${roll.total}**`);
            }
            else {
                embed.setTitle(`🎲 ${roll.total}`)
                    .setDescription(`-# ${output}\n`);
            }
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            await replyError(interaction, `\`${expr}\` is not a valid expression. Please double check the syntax.`);
        }
    }
};
