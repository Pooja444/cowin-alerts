import { CategoryChannel, Guild, Message, TextChannel } from "discord.js";
import { District } from "../config/types";
import { everyoneRoleID } from "./roleManager";
require('dotenv').config({ path: '../config/.env.uat' });

let alertChannels: TextChannel[] = []
export let districtsListChannelID: string = ""
export let errorAlertsChannelID: string = ""
export let newDistrictsChannelID: string = ""
export let generalChannelID: string = ""
let alertsCategoryChannelID: string = ""

export function loadChannels(server: Guild) {
    let channels = server.channels.cache.array();
    for (const channel of channels) {
        if (channel.type === "category" && channel.name === process.env.ALERTS_CATEGORY) {
            const categoryChannel = <CategoryChannel>channel
            alertChannels = <TextChannel[]>categoryChannel.children.array()
            alertsCategoryChannelID = channel.id
        }
        if (channel.name === process.env.DISTRICTS_LIST) {
            districtsListChannelID = channel.id
        } else if (channel.name === process.env.ERROR_ALERTS) {
            errorAlertsChannelID = channel.id
        } else if (channel.name === process.env.NEW_DISTRICTS) {
            newDistrictsChannelID = channel.id
        } else if (channel.name === process.env.GENERAL) {
            generalChannelID = channel.id
        }
    }
}

export async function createChannel(message: Message, district: District): Promise<string> {
    const server: Guild = message.guild;
    const districtName = district.district_name.toLowerCase()

    try {
        const channel: TextChannel = await server.channels.create(districtName + "-alerts", {
            topic: `This channel will display alerts for district ${districtName}. Created on ${new Date()}`
        })
        alertChannels.push(channel)
        channel.setParent(alertsCategoryChannelID)
        let newChannelMessage: string = `${message.author.username} created a new channel <#${channel.id}>\nDistrict ID: ${district.district_id}`

        const webhookURL = await createWebHookAndGetURL(channel, districtName)
        if (webhookURL != null) {
            newChannelMessage += `\nWebhook URL: ${webhookURL}`
        } else {
            newChannelMessage += `\nWebhook creation failed for ${districtName}! Please create it manually`
        }

        return Promise.resolve(newChannelMessage)
    } catch (error) {
        console.log(error);
        (<TextChannel>message.guild.channels.cache
            .get(errorAlertsChannelID))
            .send(`An error occurred when ${message.author.username} tried to create channel for district ${districtName} - ${error}`)

        return Promise.resolve(undefined)
    }

}

export function checkChannelAndGetID(districtName: string) {
    const channelName: string = `${districtName}-alerts`.replace(/ /g, "-")
    for (const alertChannel of alertChannels) {
        if (channelName === alertChannel.name) {
            return alertChannel.id
        }
    }
    return null
}

async function createWebHookAndGetURL(channel: TextChannel, districtName: string): Promise<string> {
    try {
        const webhook = await channel.createWebhook(`${districtName} alerts`, {});
        return Promise.resolve(webhook.url)
    } catch (error) {
        console.log(error);
        return Promise.resolve(null)
    }
}

export function addRoleToChannel(server: Guild, channelID: string, roleID: string) {
    server.channels.cache.get(channelID).overwritePermissions([
        {
            id: everyoneRoleID,
            deny: ['VIEW_CHANNEL']
        },
        {
            id: roleID,
            allow: ['VIEW_CHANNEL']
        }
    ])
}