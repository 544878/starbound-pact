export type Tag = 'NORMAL_ACTION' | 'ULTIMATE_ROOT' | 'FOLLOW_UP' | 'DOT_NATURAL' | 'DOT_EARLY' | 'REPLAY' | 'SUMMON' | 'REACTION' | 'SHIELD_ABSORB' | 'HP_COST' | 'SKILL_HEAL' | 'PASSIVE_HEAL' | 'ENERGY_TRANSFER' | 'EQUIPMENT' | 'WEAPON';
export interface Event {
  root_id: string; event_id: string; source_actor: string; target: string;
  parent_id: string | null; tags: Tag[]; depth: number; av: number;
  amount: number; effective: number; detail: string;
}
const noResource = new Set<Tag>(['REPLAY', 'SUMMON', 'REACTION', 'EQUIPMENT', 'WEAPON', 'ENERGY_TRANSFER']);
export const canGenerateResource = (event: Pick<Event, 'tags'>) => !event.tags.some(t => noResource.has(t));
export const canRecord = (event: Pick<Event, 'tags'>) => event.tags.includes('NORMAL_ACTION') && !event.tags.some(t => noResource.has(t)) && !event.tags.includes('FOLLOW_UP');
/** Explicit allowed edges, plus separate anomaly guards. No arbitrary recursive callbacks. */
export class RootEvents {
  readonly events: Event[] = [];
  constructor(readonly rootId: string, readonly av: number, readonly allowed: ReadonlyArray<readonly [Tag, Tag]>) {}
  emit(source: string, target: string, tag: Tag, amount = 0, effective = 0, detail = '', parent?: Event): Event {
    if (this.events.length >= 32) throw new Error(`V2 root event overflow: ${this.rootId}`);
    if (parent && (!this.events.includes(parent) || parent.root_id !== this.rootId)) throw new Error('V2 foreign parent');
    if (!parent && this.events.length) throw new Error('V2 root already emitted');
    const depth = parent ? parent.depth + 1 : 0;
    if (depth > 2) throw new Error('V2 derived depth overflow');
    if (parent && !this.allowed.some(([a, b]) => parent.tags.includes(a) && b === tag)) throw new Error(`V2 undeclared event edge: ${parent.tags} -> ${tag}`);
    const event: Event = { root_id: this.rootId, event_id: `${this.rootId}:${this.events.length}`, source_actor: source, target, parent_id: parent?.event_id ?? null, tags: [tag], depth, av: this.av, amount, effective, detail };
    this.events.push(event);
    return event;
  }
}
