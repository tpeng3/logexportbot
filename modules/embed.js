import { EmbedBuilder, MessageType, Events } from "discord.js";
import { COLORS, rError } from "./global.ts";
export default function (client) {
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild?.channels)
            return;
        if (message.author.bot)
            return;
        let args = message.content.split(" ");
        const command = args[0];
        args.shift();
        if (command === ">embed") {
            const link = args[0].split("/");
            const channelId = link.at(-2);
            const messageId = link.at(-1);
            const channel = message.guild.channels.cache.get(channelId);
            if (!channel)
                return rError(message, "Please provide a Discord link to embed.");
            const post = await channel.messages.fetch(messageId);
            if (!post)
                return rError(message, "Couldn't find a valid Discord message to embed.");
            try {
                const embed = new EmbedBuilder().setColor(COLORS.default);
                const fields = post.content.split("\n");
                let author, authorpic;
                for (let i in fields) {
                    if (fields[i].includes("AuthorPic:")) {
                        authorpic = fields[i].replace(/\*|<|>|AuthorPic:|AuthorPic: |/g, "").trim();
                    }
                    else if (fields[i].includes("Author:")) {
                        author = fields[i].replace(/\*|\_|Author:|Author: |/g, "").trim();
                    }
                    else if (fields[i].includes("Title:")) {
                        const title = fields[i].replace(/\*|Title:|Title: /g, "").trim();
                        if (title)
                            embed.setTitle(title);
                    }
                    else if (fields[i].includes("Thumbnail:")) {
                        const thumbnail = fields[i].replace(/\*|<|>|Thumbnail:|Thumbnail: /g, "").trim();
                        if (thumbnail)
                            embed.setThumbnail(thumbnail);
                    }
                    else if (fields[i].includes("Image:")) {
                        const image = fields[i].replace(/\*|<|>|Image:|Image: /g, "").trim();
                        if (image)
                            embed.setImage(image);
                    }
                    else if (fields[i].includes("Color:")) {
                        const color = fields[i].replace(/\*|<|>|Color:|Color: /g, "").trim();
                        if (color)
                            embed.setColor(color);
                    }
                }
                if (author && authorpic) {
                    embed.setAuthor({ name: author, iconURL: authorpic });
                }
                else if (author) {
                    embed.setAuthor({ name: author });
                }
                if (post.content.includes("**Description:**")) {
                    const description = post.content.split("**Description:**").at(1);
                    if (description)
                        embed.setDescription(description.trim());
                }
                message.delete();
                if (message.type === MessageType.Reply && message.reference?.messageId) {
                    await message.channel.send({ embeds: [embed], reply: { messageReference: message.reference.messageId } });
                }
                else {
                    await message.channel.send({ embeds: [embed] });
                }
            }
            catch (e) {
                return rError(message, "There was an error formatting the embed:\n" + e);
            }
        }
    });
}
;
