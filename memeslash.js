const Command = require('command')
 
module.exports = function ProjectileExploit(dispatch) {
    const command = Command(dispatch)
   
    let enabled = false
    let plyrs = false
    let targetAll = false
    let state = 0//0 = aimtarget, 1 = single target, 2 = target all
    let statesave = 0;
    let shiftpos = 0
    let cid = null
   
    let packets = []
    let targets = []
    let players = {}
    let singleTarget = null;
    let timeout = null
   
    let timerTick = 10
    let timerIterations = 100
    let lastJ = 0
    let single = false;
   
    let curX = 0
    let curY = 0
    let curZ = 0
   
    let statenames = ['free aiming', 'target all auto', 'singletarget auto']
   
    command.add('pestat', () => {
        if (enabled) {
            command.message('PE Status: [enabled] ' + statenames[state])
        } else {
            command.message('PE Status: [disabled] ' + statenames[state])
        }
    })
   
   
    command.add('pe', () => {
        enabled = !enabled
        single = false;
        command.message('Projectile exploit module '+(enabled?'enabled':'disabled')+'.')
    })
   
    command.add('select', (t) => {
        command.message('Target '+t+' selected. ('+ getPidforName(t) + ')')
        statesave = state
        state = 0
        singleTarget = getPidforName(t)
    })
   
    command.add('unselect', () => {
        command.message('Target ' + singleTarget + ' unselected.')
        state = statesave
    })
   
    command.add('peall', () => {
        state = 1
        targets = []
        players = {}
        command.message('Targeting all targets' + (state == 1 ?'enabled':'disabled')+'.')
    })
   
    command.add('peaim', () => {
        state = 2
        targets = []
        players = {}
        command.message('Targeting aimed targets.')
    })
   
    command.add('shiftpos', (offset) => {
        shiftpos = parseFloat(offset)
        command.message('ShiftPos '+(shiftpos)+'.')
    })
   
    command.add('pes', (newTick, newIterations) => {
        timerTick = parseInt(newTick)
        timerIterations = parseInt(newIterations)
        enabled = true
        command.message(`Now rddepeating every ${timerTick} ms, ${timerIterations} times`)
    })
   
   
   
    command.add('playerlist', () => {
    var playerslist = '{'
        for (var key in players) {
            playerslist += '[' + players[key] + '], '
        }
        playerslist+='}'
        command.message('Players: ' + playerslist)
    })
   
    dispatch.hook('S_LOGIN', 2, (event) => {
        cid = event.cid
    })
   
    dispatch.hook('C_PLAYER_LOCATION', (event) => {
        curX = event.x1;
        curY = event.y1;
        curZ = event.z1;
        if (shiftpos === 0) return
        event.z1 += shiftpos
        event.z2 += shiftpos
        return true
    })
   
    dispatch.hook('S_ACTION_STAGE', (event) => {
        if (shiftpos === 0) return
        if (event.source.toString() !== cid.toString()) return
        event.x = curX
        event.y = curY
        event.z = curZ
        return true
    })
   
    dispatch.hook('S_ACTION_END', (event) => {
        if (shiftpos === 0) return
        if (event.source.toString() !== cid.toString()) return
        event.x = curX
        event.y = curY
        event.z = curZ
        return true
    })
   
    dispatch.hook('S_SPAWN_NPC', (event) => {
        targets.push(event.id)
        console.log('NPC found: ' + event.id)
    })
   
    dispatch.hook('S_SPAWN_USER',5 , (event) => {
        console.log('USER found: ' + event.name + ' id: ' + (event.cid));
        players[event.cid] = event.name
    })
   
    dispatch.hook('S_DESPAWN_USER',2 , (event) => {
        console.log('USER removed: ' + players[event.target] + ' id: ' +  event.target);
        delete players[event.target]
    })
   
    dispatch.hook('S_DESPAWN_NPC', (event) => {
        for (let i = 0; i < targets.length; i++) {
            if (targets[i].toString() === event.target.toString()) {
                targets.splice(i, 1)
                i--;
            }
        }
    })
   
    function getPidforName(name) {
        for(var key in players) {
            if (players[key] === name) {
                return key
            }
        }
    }
   
    function runTimer()
    {
        let i = 0
        let j = lastJ
        if (j >= packets.length) j = 0
       
        while (i < timerIterations) {
            dispatch.toServer('C_HIT_USER_PROJECTILE', packets[j])
            i++
            j++
            if (j >= packets.length) j = 0
        }
       
        lastJ = j
       
        if (timeout !== null) {
            timeout = setTimeout(() => {
                runTimer()
            }, timerTick)
        }
    }
   
    function addPacket(event)
    {
        packets.push(event)
        if (timeout === null) {
            timeout = setTimeout(() => {
                runTimer()
            }, timerTick)
        }
    }
   
    function clearProjectile(projectileId)
    {
        for (let i = 0; i < packets.length; i++) {
            if (packets[i].source.toString() === projectileId.toString()) {
                packets.splice(i, 1)
                i--;
            }
        }
       
        if (packets.length === 0) {
            if (timeout !== null) {
                clearTimeout(timeout)
                timeout = null
            }
        }
    }
   
    dispatch.hook('S_START_USER_PROJECTILE', (event) => {
        if (enabled) {
            if (event.source.toString() !== cid.toString()) return
            switch(state) {
                case 0:
                    console.log('Killing single target: ' + players[singleTarget])
                    let packet = {
                            source: event.id,
                            end: 0,
                            x: event.x1,
                            y: event.y1,
                            z: event.z1,
                            targets: [
                                {
                                    target: singleTarget,
                                    unk1: 0
                                }
                            ]
                        }
                    addPacket(packet)
                    break
                case 1:
                    for (let tgt of targets) {
                        let packet = {
                            source: event.id,
                            end: 0,
                            x: event.x1,
                            y: event.y1,
                            z: event.z1,
                            targets: [
                                {
                                    target: tgt,
                                    unk1: 0
                                }
                            ]
                        }
                        addPacket(packet)
                    }
                    for (var key in players) {
                        let packet = {
                            source: event.id,
                            end: 0,
                            x: event.x1,
                            y: event.y1,
                            z: event.z1,
                            targets: [
                                {
                                    target: key,
                                    unk1: 0
                                }
                            ]
                        }
                        addPacket(packet)
                    }
                    break
                case 2:
                    break
                default:
                    break
                    }
                }
        })
   
    dispatch.hook('C_HIT_USER_PROJECTILE', (event) => {
        if (event.end !== 0) {
            clearProjectile(event.source)
            return
        }
       
        if (!enabled) return
        addPacket(event)
       
        return false
    })
   
    dispatch.hook('S_END_USER_PROJECTILE', (event) => {
        clearProjectile(event.id)
    })
}


