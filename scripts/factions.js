import { Database } from "./Database.js"
import { system, world, Vector, Player } from "@minecraft/server"
const database = new Database("TripplesDatabase")
const dB = database.all
import { CONFIG } from "./index"
if (!dB.factions) dB.factions = []
if (!dB.playerStats) dB.playerStats = []
if (!dB.invites) dB.invites = []
let faction_tp = new Map()


world.events.beforeChat.subscribe((data) => {
    const { message, sender: player } = data
    function kd(player) {
        return getScore(player, CONFIG.kill_objective) / getScore(player, CONFIG.death_objective) === 0 ? 1 : getScore(player, CONFIG.death_objective)
    }
    if (message.startsWith(".")) data.cancel = true
    if (message.startsWith(".")) {
        const args = message.replace(".", "").split(" ")
        switch (args[0]) {
            case "f":
            case "faction": {
                data.cancel = true
                if (args[1] === "help" || args[1] === "h") {
                    //#region ugly help menu
                    player.sendMessage(`
§eFactions Help\n--------------------------------
§6.f create <name> §f- §7Create a faction.
§6.f invite <player> §f- §7Invite a player to your faction.
§6.f accept <faction> §f- §7Accept an invitation to a faction.
§6.f leave §f- §7Leave your faction.

§6.f sethome §f- §7Sets your faction home.
§6.f home §f- §7Teleports you to your faction home.

§6.f kick <player> §f- §7Kick a player from your faction. 
§6.f disband §f- §7Disbands your faction.
§6.f info <faction> §f- §7Get info about a faction. 
§6.f who <name> §f- §7sendMessages you what faction a player is in.
§6.f top §f- §7Get the top factions.
§6.f chat §f- §7Messages you send will only be a visible to people in your faction.

§6.f promote <player> §f- §7Promote a player to officer. 
§6.f demote <player> §f- §7Demote a player from officer.
§6.f transfer <player> §f- §7Transfer ownership of a faction to a member.

§6.f enemy <faction> §f- §7Declare a faction as an enemy.
§6.f enemy remove <faction> §f- §7Remove a faction from your enemies.
§6.f enemy list §f- §7List your faction's enemies.
                

`)
                    // #endregion
                }
                if (args[1] === "create") {
                    const factionName = args[2]
                    if (dB.factions.includes(factionName)) {
                        player.sendMessage("§cA faction with that name already exists!")
                    } else {
                        if (!factionName.match(/^[a-zA-Z0-9]+$/)) {
                            player.sendMessage("§cName cannot contain symbols!")
                            return
                        }
                        if (args[2].length > 8 || args[2].length < 3) {
                            player.sendMessage("§cName must be 3-8 characters!")
                            return
                        }
                        for (const faction of dB.factions) {
                            if (faction.members.includes(player.name)) {
                                player.sendMessage("§cYou are already in a faction!")
                                return
                            }
                        }
                        dB.factions.push({
                            name: factionName,
                            officers: [],
                            members: [data.sender.name],
                            leader: data.sender.name,
                            power: 0,
                            home: {x: 0, y: 0, z: 0},
                            enemies: []
                        })
                        player.sendMessage("§aSuccessfully created faction!")
                    }
                }
                if (args[1] === "i" || args[1] === "invite") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name && !faction.officers?.includes(player.name)) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    if (dB.invites?.find(i => i.player === target.name && i.faction.name === faction.name)) {
                        player.sendMessage("§cThat player has already been invited!")
                        return
                    }
                    if (getFaction(target) !== "None") {
                        player.sendMessage("§cThat player is already in a faction!")
                        return
                    }
                    target.sendMessage(`§a${faction.name} has invited you to join their faction! Do .f accept ${faction.name} to join!`)
                    dB.invites.push({faction: faction, player: target.name})
                    player.sendMessage("§aSuccessfully invited player!")
                }
                if (args[1] === "accept" || args[1] === "join" || args[1] === "a") {
                    const faction = args[2]
                    if (getFaction(player) !== "None") {
                        player.sendMessage("§cYou are already in a faction!")
                        return
                    }
                    if (!dB.invites.find(i => i.player === player.name && i.faction.name === faction)) {
                        player.sendMessage("§cYou have not been invited to that faction!")
                        return
                    }
                    const foundFaction = dB.factions.find(f => f.name === faction)
                    foundFaction.members.push(player.name)
                    dB.invites.splice(dB.invites.indexOf(dB.invites.find(i => i.player === player.name && i.faction.name === faction)), 1)

                    player.sendMessage("§aSuccessfully joined faction!")
                }
                if (args[1] === "leave") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader === player.name) {
                        player.sendMessage("§cYou cannot leave your own faction!")
                        return
                    }
                    faction.members.splice(faction.members.indexOf(player.name), 1)

                    player.sendMessage("§aSuccessfully left faction!")
                }
                if (args[1] === "disband") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    dB.factions.splice(dB.factions.indexOf(faction), 1)

                    player.sendMessage("§aSuccessfully disbanded faction!")
                }
                if (args[1] === "info" || args[1] === "view" || args[1] === "v") {
                    let faction = args[2]
                    if (!faction) faction = getFaction(player).name
                    if (faction === "None") return player.sendMessage("§cSpecify a faction!")
                    const foundFaction = dB.factions.find(f => f.name === faction)
                    if (!foundFaction) return player.sendMessage("§cThat faction does not exist!")
                    player.sendMessage(`
§b>----------§6${faction}§b----------<
§eLeader: §7${getFactionMembers(foundFaction).leader}
§eOfficers: §7${foundFaction.officers.filter(o => foundFaction.leader !== o).length > 0 ? getFactionMembers(foundFaction).officers.filter(o => foundFaction.leader !== o) : "None"}
§eMembers: §7${foundFaction.members.filter(m => m !== foundFaction.leader && !foundFaction.officers.includes(m)).length > 0 ? getFactionMembers(foundFaction).members : "None"}
§ePower: §7${foundFaction.power ? foundFaction.power : 0}
§eEnemies: §7${foundFaction.enemies.length > 0 ? foundFaction.enemies.join(", ") : "None"}
`)
                }
                if (args[1] === "invites") {
                    player.sendMessage(`§b>----------Invites----------<\n§e${dB.invites.filter(i => i.player === player.name).length > 0 ? dB.invites.filter(i => i.player === player.name).map(i => i.faction.name).join(", ") : "None"}`)
                }
                if (args[1] === "k" || args[1] === "kick") {
                    if (args[2] === undefined) return player.sendMessage("§cPlease specify a player!")
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name && !faction.officers?.includes(player.name)) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    if (getFaction(target) !== faction) {
                        player.sendMessage("§cThat player is not in your faction!")
                        return
                    }
                    if (target.name === faction.leader) {
                        player.sendMessage("§cYou cannot kick the leader!")
                        return
                    }
                    if (faction.officers?.includes(target.name) && faction.leader !== player.name) {
                        player.sendMessage("§cYou cannot kick an officer!")
                        return
                    }
                    faction.members.splice(faction.members.indexOf(target.name), 1)

                    target.sendMessage(`§cYou have been kicked from ${faction.name}!`)
                    player.sendMessage("§aSuccessfully kicked player!")
                }
                if (args[1] === "decline" || args[1] === "deny" || args[1] === "d") {
                    const faction = args[2]
                    if (!faction) return player.sendMessage("§cPlease specify a faction!")
                    if (faction === "a" || "all") dB.invites.find(i => i.player === player.name)?.splice(0, dB.invites.find(i => i.player === player.name).length)
                    if (!dB.invites.find(i => i.player === player.name && i.faction.name === faction)) {
                        player.sendMessage("§cYou have not been invited to that faction!")
                        return
                    }
                    dB.invites.splice(dB.invites.indexOf(dB.invites.find(i => i.player === player.name && i.faction.name === faction)), 1)

                    player.sendMessage("§aSuccessfully declined invite!")
                }
                if (args[1] === "promote" || args[1] === "p") {
                    if (args[2] === undefined) return player.sendMessage("§cPlease specify a player!")
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (!faction.officers?.includes(player.name) && faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    if (getFaction(target) !== faction) {
                        player.sendMessage("§cThat player is not in your faction!")
                        return
                    }
                    if (target.name === faction.leader) {
                        player.sendMessage("§cYou cannot promote the leader!")
                        return
                    }
                    if (faction.officers?.includes(target.name)) {
                        player.sendMessage("§cThat player is already an officer!")
                        return
                    }
                    faction.officers.push(target.name)

                    target.sendMessage(`§aYou have been promoted to officer in ${faction.name}!`)
                    player.sendMessage("§aSuccessfully promoted player!")
                }
                if (args[1] === "demote") {
                    if (args[2] === undefined) return player.sendMessage("§cPlease specify a player!")
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    if (getFaction(target) !== faction) {
                        player.sendMessage("§cThat player is not in your faction!")
                        return
                    }
                    if (target.name === faction.leader) {
                        player.sendMessage("§cYou cannot demote the leader!")
                        return
                    }
                    if (!faction.officers?.includes(target.name)) {
                        player.sendMessage("§cThat player is not an officer!")
                        return
                    }
                    faction.officers.splice(faction.officers.indexOf(target.name), 1)

                    target.sendMessage(`§cYou have been demoted from officer in ${faction.name}!`)
                    player.sendMessage("§aSuccessfully demoted player!")
                }
                if (args[1] === "transfer") {
                    if (args[2] === undefined) return player.sendMessage("§cPlease specify a player!")
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    if (getFaction(target) !== faction) {
                        player.sendMessage("§cThat player is not in your faction!")
                        return
                    }
                    if (target.name === faction.leader) {
                        player.sendMessage("§cYou cannot transfer to the leader!")
                        return
                    }
                    faction.leader = target.name

                    target.sendMessage(`§aYou are now the leader of ${faction.name}!`)
                    player.sendMessage("§aSuccessfully transferred leadership!")
                }
                if (args[1] === "sethome") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    if (player.hasTag("inPvP")) return player.sendMessage("§cYou cannot do that in PvP!")
                    if (dB.factions.find(f => f.home !== undefined && f.name !== getFaction(player).name && Vector.distance(new Vector(f.home.x, f.home.y, f.home.z), player.location) < 275)) return player.sendMessage("§cThere is already a faction home within 275 blocks of that location!")
                    if (Vector.distance(new Vector(0, 70, 0), player.location) < 275) return player.sendMessage("§cYou cannot set a faction home within 275 blocks of spawn!")
                    faction.home = player.location

                    player.sendMessage("§aSuccessfully set faction home!")
                }
                if (args[1] === "home") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.home === undefined) {
                        player.sendMessage("§cYour faction does not have a home!")
                        return
                    }
                    if (player.hasTag("inPvP")) return player.sendMessage("§cYou cannot do that in PvP!")
                    faction_tp.set(player.name, Date.now())
                    player.sendMessage("§7Teleporting....")
                }
                if (args[1] === "who") {
                    const target = world.getAllPlayers().find(p => p.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat player does not exist!")
                        return
                    }
                    player.sendMessage(
                        `§b----------§6${target.name}§b----------
§6Faction: §c${getFaction(target).name ? getFaction(target).name : "None"}
§6Power: §c${dB.playerStats.find(p => p.name === target.name)?.power ? dB.playerStats.find(p => p.name === target.name).power : 0}
§6Kills: §c${getScore(target, "Kills")}
§6Deaths: §c${getScore(target, "Deaths")}
§6KDR: §c${kd(target)}
                `)
                }
                if (args[1] === "top" || args[1] === "t" || args[1] === "leaderboard") {
                    const factions = dB.factions
                    factions.sort((a, b) => b.power - a.power)
                    let msg = "§b----------§6Faction Leaderboard§b----------§e"
                    for (let i = 0; i < 5; i++) {
                        if (factions[i] === undefined) break
                        msg += `\n§e${i + 1}. §7${factions[i].name} §c- ${factions[i].power}`
                    }
                    player.sendMessage(msg)
                }
                if (args[1] === "enemy" || args[1] === "e") {
                    const faction = getFaction(player)
                    if (faction === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (faction.leader !== player.name) {
                        player.sendMessage("§cYou do not have permission to do that!")
                        return
                    }
                    if (args[2] === undefined) return player.sendMessage("§cPlease specify a faction!")
                    if (args[2] === "remove") {
                        if (args[3] === undefined) return player.sendMessage("§cPlease specify a faction!")
                        const target = dB.factions.find(f => f.name === message.split(" ").slice(3).join(" "))
                        if (target === undefined) {
                            player.sendMessage("§cThat faction does not exist!")
                            return
                        }
                        if (target === faction) {
                            player.sendMessage("§cYou cannot enemy your own faction!")
                            return
                        }
                        if (!faction.enemies.includes(target.name)) {
                            player.sendMessage("§cYou are not enemies with that faction!")
                            return
                        }
                        faction.enemies.splice(faction.enemies.indexOf(target.name), 1)

                        player.sendMessage("§aSuccessfully removed faction from enemies!")
                        return
                    }
                    if (args[2] === "list") {
                        let msg = "§b----------§6Enemies§b----------"
                        for (const enemy of faction.enemies) {
                            msg += `\n§6${enemy}`
                        }
                        player.sendMessage(msg)
                        return
                    }
                    const target = dB.factions.find(f => f.name === message.split(" ").slice(2).join(" "))
                    if (target === undefined) {
                        player.sendMessage("§cThat faction does not exist!")
                        return
                    }
                    if (target === faction) {
                        player.sendMessage("§cYou cannot enemy your own faction!")
                        return
                    }
                    if (faction.enemies.includes(target.name)) {
                        player.sendMessage("§cYou are already enemies with that faction!")
                        return
                    }
                    faction.enemies.push(target.name)

                    player.sendMessage("§aSuccessfully added faction to enemies!")
                }
                if (args[1] === "chat" || args[1] === "c") {
                    if (getFaction(player) === "None") {
                        player.sendMessage("§cYou are not in a faction!")
                        return
                    }
                    if (player.hasTag("inFactionChat")) {
                        player.removeTag("inFactionChat")
                        player.sendMessage("§cYou are no longer in faction chat!")
                        return
                    }
                    player.addTag("inFactionChat")
                    player.sendMessage("§aYou are now in faction chat!")
                }

            }
            default:
                return player.sendMessage("§cInvalid command! Use .f help for help!")
        }
    }
    if (player.hasTag("inFactionChat")) {
        data.cancel = true
        for (const p of world.getPlayers()) {
            if (getFaction(p) === getFaction(player)) {
                p.sendMessage(`§6[Faction] §7${player.name}§f: §e${message}`)
            }
        }
    }
})


export function getFaction(player) {
    for (const faction of dB.factions) {
        if (typeof player === "string" && faction.members.includes(player)) return faction
        if (typeof player !== "string" && faction.members.includes(player.name)) return faction
    }
    return "None"
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (faction_tp.has(player.name)) {
            player.onScreenDisplay.setActionBar("§7Teleporting in §c" + Math.ceil((5000 - (Date.now() - faction_tp.get(player.name))) / 1000) + "§7 seconds!")
            if (Date.now() > faction_tp.get(player.name) + 5000) {
                player.runCommandAsync(`tp ${getFaction(player).home.x} ${getFaction(player).home.y} ${getFaction(player).home.z}`)
                player.sendMessage("§aTeleported to faction home!")
                faction_tp.delete(player.name)
            }
        }
        if (!dB.playerStats.find(d => d.name === player.name)) dB.playerStats.push({ name: player.name, power: 0 })
        const foundPlayer = dB.playerStats.find(p => p.name === player.name)
        foundPlayer.kills = getScore(player, "Kills")
        foundPlayer.deaths = getScore(player, "Deaths")
        foundPlayer.power = getScore(player, CONFIG.kill_objective) * CONFIG.power_events.kill + getScore(player, CONFIG.death_objective) * CONFIG.power_events.death
    }
    for (const faction of dB.factions) {
        faction.power = 0
        for (const member of faction.members) {
            faction.power += dB.playerStats.find(p => p.name === member).power
        }
        for (const enemy of faction.enemies) {
            if (dB.factions.find(f => f.name === enemy)) continue
            faction.enemies.splice(faction.enemies.indexOf(enemy), 1)
        }
        
    }

}, 5)

export function getRole(player) {
    const faction = getFaction(player)
    if (faction === "None") return "None"
    if (faction.leader === player.name) return "Leader"
    if (faction.officers.includes(player.name)) return "Officer"
    return "Member"
}

export function getFactionMembers(faction) {
    const officers = []
    for (const officer of faction.officers.filter(o => o!== faction.leader)) {
        officers.push(world.getAllPlayers().find(p => p.name === officer) ? `§a*${officer}` : `§7*${officer}`)
    }
    const members = []
    for (const member of faction.members.filter(m => !faction.officers.includes(m) && faction.leader!== m)) {
        members.push(world.getAllPlayers().find(p => p.name === member) ? `§a+${member}` : `§7+${member}`)
    }
    return { members: members, officers: faction.officers, leader: world.getAllPlayers().find(p => p.name === faction.leader) ? `§a**${faction.leader}` : `§7**${faction.leader}` }
}

export function getRoleSymbol(player) {
    const role = getRole(player)
    if (role === "Leader") return "**"
    if (role === "Officer") return "*"
    if (role === "Member") return "+"
    return ""
}
export function getScore(player, objective) {
    try {
        if (typeof player === "string") return world.scoreboard.getObjective(objective).getScore(world.scoreboard.getObjective(objective).getParticipants().find(p => p.name === player));
        return world.scoreboard.getObjective(objective).getScore(player.scoreboard);
    }
    catch (error) {
        return 0;
    }
}
