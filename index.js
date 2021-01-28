'use strict';

class cooldown {
	
	constructor(mod) {
		
		this.mod = mod;
		this.command = mod.command;
		this.hook = null;
		var enabled, channel, job, includeAllies, members, selfTimers;
		enabled = false;
		channel = 2;	// party=1, guild=2, raid=32
		job = 0;
		includeAllies = false;	// todo - track allies' cdr & cds
		members = [];
		selfTimers = [];
		
		// command
		mod.command.add('cooldown', {
			'$none': () => {
				enabled = !enabled;
				this.send(`${enabled ? 'En' : 'Dis'}abled.`);
			},
			'allies': () => {
				includeAllies = !includeAllies;
				this.send(`Cooldowns of allies ${includeAllies ? 'in' : 'ex'}cluded.`);
			},
			'p': () => {
				channel = 1;
				this.send(`Set to party chat.`);
			},
			'g': () => {
				channel = 2;
				this.send(`Set to guild chat.`);
			},
			'r': () => {
				channel = 32;
				this.send(`Set to raid chat.`);
			},
			'$default': () => {
				this.send(`Invalid argument, valid: none, allies, p, g, r`);
			}
		});
		
		// configurable skill list
		const skills = {	// ref tera-data-parser types skillid.js & tera-data readme
			0: { // Warrior
				200200: { // Deadly Gamble
					name: "dg",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				},
				350100: { // Infuriate
					name: "enrage",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: true
				}
			},
			1: { // Lancer
				170200: { // Adrenaline Rush
					name: "arush",
					reminderTimes: [20, 10, 5],
					enabledSelf: true,
					enabledAllies: true
				},
				120100: { // Infuriate
					name: "enrage",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: true
				}
			},
			2: { // Slayer
				200300: { // In Cold Blood
					name: "icb",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			3: { // Berserker
				330100: { // Unleash
					name: "sicko mode",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			4: { // Sorcerer
				340200: { // Mana Boost
					name: "boost",
					reminderTimes: [5],
					enabledSelf: true,
					enabledAllies: false
				}
			},
			5: { // Archer
				350100: { // Windsong
					name: "song",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			6: { // Priest
				// xD
			},
			7: { // Mystic
				340700: { // Thrall of Wrath
					name: "andré",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				},
				410800: { // Contagion
					name: "contagion",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			8: { // Reaper
				230100: { // Binding Scythes
					name: "binding",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: false
				},
				160100: { // Shadow Reaping
					name: "sr",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			9: { // Gunner
				410100: { // Modular Weapon System
					name: "mws",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			10: { // Brawler
				140100: { // Infuriate
					name: "enrage",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: true
				},
				260100: { // Rhythmic Blows
					name: "rb",
					reminderTimes: [5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			11: { // Ninja
				90100: { // Smoke Bomb
					name: "smoke",
					reminderTimes: [5],
					enabledSelf: true,
					enabledAllies: true
				},
				230100: { // Inner Harmony
					name: "ih",
					reminderTimes: [20, 5],
					enabledSelf: false,
					enabledAllies: false
				}
			},
			12: { // Valkyrie
				// xD
			}
		};
		
		// helper
		function say(msg) {
			var formattedMessage = '<FONT>' + msg + '</FONT>';
			if (enabled && (members.length > 0 || channel == 0)) {
				mod.send('C_CHAT', 1, {
					channel:	channel,
					message:	formattedMessage
				});
			}
		}
		
		// network
		// own skills
		this.hook = mod.hook('S_START_COOLTIME_SKILL', 3, (e) => {
			if (enabled) {
				if (skills[job][e.skill.id] && skills[job][e.skill.id].enabledSelf) {
					skills[job][e.skill.id].reminderTimes.forEach(function(value, index, array) {
						selfTimers.push(mod.setTimeout(say, (e.cooldown - (value * 1000)), (skills[job][e.skill.id].name + ' in ' + value)));
					});
				}
			}
		});
		
		this.hook = mod.hook('S_LOAD_TOPO', 3, (e) => {
			var j, len;
			for (j = 0, len = selfTimers.length; j < len; j++) {
				mod.clearTimeout(selfTimers[j]);
			}
			selfTimers = [];
		});
		
		// others' skills
		this.hook = mod.hook('S_ACTION_STAGE', 9, (e) => {
			if (enabled && includeAllies && e.gameId != mod.game.me.gameId) {	// not self
				// someone else used a skill
			}
		});
		
		// maintenance
		this.hook = mod.hook('S_LOGIN', 14, (e) => {
			job = (e.templateId - 10101) % 100;
		});
		this.hook = mod.hook('S_PARTY_MEMBER_LIST', 8, (e) => {
			members = [];
			e.members.forEach(function(value, index, array) {
				members.push(value);	// see S_PARTY_MEMBER_LIST.8.def
			});
		});
		this.hook = mod.hook('S_LEAVE_PARTY', 1, (e) => {
			members = [];
		});
	}
	
	// send
	send(message) {
		this.command.message(': ' + message);
	}
	
	destructor() {
		this.command.remove('cooldown');
		this.mod.unhook(this.hook);
		this.hook = null;
	}
	
}

module.exports = { NetworkMod: cooldown };
