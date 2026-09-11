import type { Companion } from '../../domain/types';
import type { Stats, Bonuses, Coefficients, Shape, DamageOptions } from './math';
import type { Resource, Points } from './resources';
import type { Clock, Duration } from './timeline';
import type { Shield, HpCost, Deferred, Toughness } from './defense';
import type { Dot, SkillRecord, DefenseRecord } from './records';
import type { Aura, Element } from './elements';
import type { Event } from './events';
import type { CharacterDesign } from './catalog';
export type Command = 'basic' | 'skill' | 'ultimate';
export interface Status { key: string; owner: string; value: number; duration: Duration; uses?: number; data?: string }
export interface Unit {
  id: string; name: string; companion: Companion; design: CharacterDesign; stats: Stats; bonuses: Bonuses;
  hp: number; resource: Resource; clock: Clock; shields: Shield[]; statuses: Status[];
  records: SkillRecord[]; defenseRecords: DefenseRecord[]; counters: Record<string, number>; strings: Record<string, string>;
  weapon?: CharacterDesign['weapon']; refinement: number;
}
export interface Enemy {
  id: string; name: string; hp: number; maxHp: number; stats: Stats; clock: Clock; toughness: Toughness;
  art: string; boss: boolean; weaknesses: string[]; auras: Aura[]; shields: Shield[]; statuses: Status[];
  phase: number; counters: Record<string, number>; intent: 'single' | 'all' | 'charge'; target: string; chargingUntil: number;
}
export interface Scheduled { id: string; owner: string; target: string; at: number; kind: 'attack' | 'heal' | 'enemy' | 'field-end'; coefficients: Coefficients; shape: Shape; channel?: DamageOptions['channel']; element?: Element; heavy?: boolean; retarget?: boolean }
export interface Battle {
  version: 2; av: number; limit: number; encounterId: string; name: string; units: Unit[]; enemies: Enemy[];
  waves: Array<Array<{ name: string; hp: number }>>; wave: number; points: Points;
  active: string; outcome: 'playing' | 'win' | 'loss' | 'timeout'; scheduled: Scheduled[];
  dots: Dot[]; costs: HpCost[]; debts: Deferred[]; log: Event[]; serial: number;
  lastActor: string; lastCommand: Command | ''; lastElement: Element; actionKinds: string[];
  blessing: 'feature' | 'safety' | 'cycle'; counters: Record<string, number>;
}
export interface Action { actor: string; command: Command; enemy: string; ally: string; secondAlly?: string; option?: string }
export interface SkillContext {
  b: Battle; u: Unit; target: Enemy; ally: Unit; second: Unit; action: Action;
  hit: (c: Coefficients, shape?: Shape, channel?: DamageOptions['channel'], target?: Enemy, element?: Element, breakAmount?: number) => number;
  heal: (c: Coefficients, who?: Unit | 'all', passive?: boolean) => number;
  shield: (c: Coefficients, who?: Unit | 'all', source?: string) => void;
  status: (who: Unit | Enemy, key: string, value: number, duration?: Duration, uses?: number, data?: string) => void;
  dot: (c: Coefficients, count: number, who?: Enemy, kind?: 'burn' | 'poison') => void;
  early: (ownerOnly: boolean, count: number, who?: Enemy) => void;
  energy: (who: Unit, amount: number, external?: boolean) => void;
  schedule: (delay: number, c: Coefficients, shape?: Shape, kind?: Scheduled['kind'], who?: string) => void;
}
