const { EmbedBuilder } = require("discord.js");

global.reply = async (interaction, msg, color = config.colors.defaultColor, editted = false, options = {}) => {
    const embed = new EmbedBuilder()
        .setColor('#67A4A6')
        .setDescription(msg)
        .setFooter({ text: "Hotato Bot", iconURL: client.user.displayAvatarURL() });

    if (options.thumbnail)
        embed.setThumbnail(options.thumbnail);
    if (editted) {
        await interaction.editReply({ embeds: [embed], ...(options.ephemeral ? { ephemeral: true } : {}) })
    } else {
        await interaction.reply({ embeds: [embed], ...(options.ephemeral ? { ephemeral: true } : {}) });
    }
}

global.replyError = async (interaction, msg, editted = false, options = {}) => {
    await reply(interaction, msg, "#f0ac97", editted, options);
}

global.replySuccess = async (interaction, msg, editted = false, options = {}) => {
    await reply(interaction, msg, "#67A4A6", editted, options);
}