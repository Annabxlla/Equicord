/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { MessageJSON } from "@vencord/discord-types";
import { MessageType } from "@vencord/discord-types/enums";
import { RelationshipStore } from "@webpack/common";

interface MessageCreatePayload {
    guildId: string;
    channelId: string;
    message: MessageJSON;
}

class Operation {
    _Type: any;
    _Intensity: any;
    _Duration: any;
    constructor(Type: any, Intensity: any, Duration: any) {
        this._Type = Type;
        this._Intensity = Intensity;
        this._Duration = Duration;
    }

    get Type() {
        return this._Type;
    }
    set Type(value) {
        this._Type = value;
    }

    get Intensity() {
        return this._Intensity;
    }
    set Intensity(value) {
        this._Intensity = value;
    }

    get Duration() {
        return this._Duration;
    }
    set Duration(value) {
        this._Duration = value;
    }

    static Vibration = 'v';
    static Shock = 's';
    static Beep = 'b';
}

class Warning {
    active: any;
    min: any;
    max: any;
    constructor(active: any, min: any, max: any) {
        this.active = active;
        this.min = min;
        this.max = max;
    }

    getActive() {
        return this.active;
    }

    getMin() {
        return this.min;
    }

    getMax() {
        return this.max;
    }
}

export const settings = definePluginSettings({
    users: {
        type: OptionType.STRING,
        description: "Comma separated list of user ids to get message toasts for",
        default: "",
        isValid(value: string) {
            if (value === "") return true;
            const userIds = value.split(",").map(id => id.trim());
            for (const id of userIds)
                if (!/\d+/.test(id)) return `${id} isn't a valid user id`;
            return true;
        },
    },
    mode: {
        type: OptionType.SELECT,
        description: "PiShock mode to use",
        default: "Shock",
        options: [
            { label: "Shock", value: Operation.Shock },
            { label: "Vibration", value: Operation.Vibration },
            { label: "Beep", value: Operation.Beep },
        ],
    },
    intensity: {
        type: OptionType.NUMBER,
        description: "PiShock intensity",
        default: 1,
        min: 1,
        max: 100,
    },
    duration: {
        type: OptionType.NUMBER,
        description: "PiShock duration in seconds (1-100)",
        default: 1,
        min: 1,
        max: 100,
    },
    warning: {
        type: OptionType.BOOLEAN,
        description: "Enable warning before sending PiShock command | If using API & Share Code method, this requires the warning to be set up on the PiShock website",
        default: true,
    },
    minWarning: {
        type: OptionType.NUMBER,
        description: "Minimum number of seconds after warning before shocking",
        default: 2,
        min: 1,
        max: 60,
    },
    maxWarning: {
        type: OptionType.NUMBER,
        description: "Maximum number of seconds after warning before shocking",
        default: 5,
        min: 1,
        max: 60,
    },
    piShockMethod: {
        type: OptionType.SELECT,
        description: "PiShock authentication method to use",
        default: "API_SHARECODE",
        options: [
            { label: "ID & Key", value: "ID_KEY" },
            { label: "API & Share Code", value: "API_SHARECODE" },
        ],
    },
    piShockId: {
        type: OptionType.STRING,
        description: "PiShock ID | Not needed for API & Share Code method",
        default: "",
        sensitive: false,
    },
    piShockKey: {
        type: OptionType.STRING,
        description: "PiShock Key | Not needed for API & Share Code method",
        default: "none",
        sensitive: false,
    },
    piShockApiKey: {
        type: OptionType.STRING,
        description: "PiShock API Key | Not needed for ID & Key method",
        default: "",
        sensitive: true,
    },
    piShockShareCode: {
        type: OptionType.STRING,
        description: "PiShock Share Code | Not needed for ID & Key method",
        default: "",
        sensitive: true,
    },
    piShockUsername: {
        type: OptionType.STRING,
        description: "PiShock Username | Not needed for ID & Key method",
        default: "",
        sensitive: false,
    },
});

export default definePlugin({
    authors: [EquicordDevs.Annabxlla],
    name: "MessagePiShocker",
    description: "Get Shocked when certain users send messages",
    settings,
    flux: {
        MESSAGE_CREATE({ message, channelId, guildId }: MessageCreatePayload) {
            if (message.type !== MessageType.DEFAULT || getCurrentChannel()?.id === channelId) return;

            const userIds = settings.store.users.split(",").map(id => id.trim());
            if (!userIds.includes(message.author.id)) return;

            const username = RelationshipStore.getNickname(message.author.id) ?? message.author.globalName ?? message.author.username;

            var op = new Operation(settings.store.mode, settings.store.intensity, settings.store.duration);
            var warning = new Warning(settings.store.warning, settings.store.minWarning, settings.store.maxWarning);

            if (settings.store.piShockMethod === "ID_KEY") {
                shock_id_key(
                    username,
                    op,
                    warning,
                    settings.store.piShockId,
                    settings.store.piShockKey
                );
            }
            else {
                shock_api_sharecode(
                    username,
                    op,
                    warning,
                    settings.store.piShockApiKey,
                    settings.store.piShockShareCode,
                    settings.store.piShockUsername
                );
            }


        }
    },
});

function shock_id_key(username: string, op: Operation, warning: Warning, pishockid: string, pishockkey: string) {
    const data = {
        Intensity: op.Intensity,
        Duration: op.Duration,
        Id: pishockid,
        Key: pishockkey,
        Op: op.Type,
        Hold: false,
        Username: username,
        Warning: {
            Active: warning.getActive(),
            Min: warning.getMin(),
            Max: warning.getMax()
        },
        UserId: null,
        Token: null
    };
    fetch('https://ps.pishock.com/PiShock/LinkOperate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(res => res.text())
        .catch(error => {
            console.error('PiShock Error:', error);
        });
}

function shock_api_sharecode(username: string, op: Operation, warning: Warning, apikey: string, sharecode: string, pishockusername: string) {
    const opcodes = {
        's': 0,
        'v': 1,
        'b': 2
    } as any;
    var type = opcodes[op.Type];

    const data = {
        Username: pishockusername,
        Name: username,
        Code: sharecode,
        Intensity: op.Intensity,
        Duration: op.Duration,
        Apikey: apikey,
        Op: type
    };
    fetch("https://corsproxy.io/?url=https://do.pishock.com/api/apioperate/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).catch(err => {
        console.error("PiShock Error:", err);
    });
}