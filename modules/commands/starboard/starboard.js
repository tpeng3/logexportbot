import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { COLORS, replyError, replySuccess } from '../../global.ts';
import { CHANNEL_CACHE } from '../../reactions.ts';
export default {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('MOD ONLY: Set up the ⭐ starboard')
        .addChannelOption(option => option.setName('channel')
        .setDescription("where to forward the highlighted posts")
        .setRequired(true))
        .addIntegerOption(option => option.setName('count')
        .setDescription("(optional) ⭐ reacts needed for forwarding (Default: 2)")
        .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return replyError(interaction, "Only the server admin can use this command to set up the ⭐ starboard. Please contact your admin or check out the [bot documentation](https://www.shuttlefrog.com/hotato-bot/) if you have further questions.");
        }
        const channel = interaction.options.getChannel("channel");
        const count = interaction.options.getInteger("count") ?? 2;
        await db.set(`settings.${interaction.guildId}.star`, channel.id);
        await db.set(`settings.${interaction.guildId}.starCount`, count);
        if (!CHANNEL_CACHE[interaction.guildId])
            CHANNEL_CACHE[interaction.guildId] = { star: '0', starCount: 0, art: '0', artCount: 0 };
        CHANNEL_CACHE[interaction.guildId].star = channel.id;
        CHANNEL_CACHE[interaction.guildId].starCount = count;
        if (count <= 0) {
            return replySuccess(interaction, `The starboard has been turned off in this server. Run \`/starboard\` with a specified count if you wish to turn it on again.`);
        }
        const embed = new EmbedBuilder()
            .setColor(COLORS.default)
            .setTitle("⭐ Starboard has been set!")
            .setDescription(`When users react to a post with at least **${count}** ⭐, the bot will post the highlight it in <#${channel.id}>.\n\n-# If you wish to turn this feature off, run \`/starboard\` and set count to 0.`);
        await interaction.reply({ embeds: [embed] });
    }
};
