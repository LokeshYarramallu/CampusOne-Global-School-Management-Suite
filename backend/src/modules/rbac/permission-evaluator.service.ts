import { Injectable } from '@nestjs/common';
import { INITIAL_ROLE_DEFINITIONS } from './role-catalog';

/**
 * Evaluates `Module → Feature → Action → Scope` against a role.
 *
 * **A note on the fourth dimension.** The constitution specifies four parts,
 * but `role-catalog.ts` stores three-element tuples in which the middle slot
 * carries a feature name *or* a scope word — `['profile','self','read']`,
 * `['students','assigned','read']`, `['attendance','class','manage']`. The
 * catalog therefore conflates feature and scope today.
 *
 * Rather than silently pick one reading, this evaluator treats the middle slot
 * as the feature and *derives* scope from it when it names a known scope word,
 * defaulting to `school` otherwise. The inference is confined to this file so
 * that when the catalog gains an explicit fourth element — which it should
 * before custom roles arrive (spec 001 FR-018) — only `scopeOf` changes.
 */

export const SCOPE_KINDS = [
  'self',
  'linked',
  'assigned',
  'school',
  'platform',
] as const;

export type ScopeKind = (typeof SCOPE_KINDS)[number];

/** Middle-slot words that name a scope rather than a feature. */
const SCOPE_WORDS: Record<string, ScopeKind> = {
  self: 'self',
  own: 'self',
  linked: 'linked',
  children: 'linked',
  assigned: 'assigned',
  class: 'assigned',
  school: 'school',
  tenant: 'school',
  platform: 'platform',
};

export interface PermissionQuery {
  module: string;
  feature: string;
  action: string;
}

@Injectable()
export class PermissionEvaluatorService {
  /** Role key → the permission tuples it grants. Built once at construction. */
  private readonly byRole = new Map<string, ReadonlyArray<readonly string[]>>(
    INITIAL_ROLE_DEFINITIONS.map((definition) => [
      definition.key,
      definition.permissions,
    ]),
  );

  /**
   * Whether the role grants this permission.
   *
   * Unknown roles are denied. A role absent from the catalog is a
   * misconfiguration, and defaulting a misconfiguration to "allow" is how
   * authorization holes are made.
   */
  can(roleKey: string, query: PermissionQuery): boolean {
    return this.matching(roleKey, query) !== null;
  }

  /**
   * The scope the role holds for this permission, or `null` when it holds the
   * permission not at all. Callers use this to narrow *which records* they may
   * touch — the guard proves the caller may perform the action, the scope
   * decides the rows.
   */
  scopeFor(roleKey: string, query: PermissionQuery): ScopeKind | null {
    const tuple = this.matching(roleKey, query);
    return tuple ? PermissionEvaluatorService.scopeOf(tuple) : null;
  }

  /** Every permission the role grants, for presentation in a profile panel. */
  permissionsOf(roleKey: string): ReadonlyArray<readonly string[]> {
    return this.byRole.get(roleKey) ?? [];
  }

  private matching(
    roleKey: string,
    query: PermissionQuery,
  ): readonly string[] | null {
    const permissions = this.byRole.get(roleKey);
    if (!permissions) return null;

    return (
      permissions.find(
        ([module, feature, action]) =>
          module === query.module &&
          feature === query.feature &&
          action === query.action,
      ) ?? null
    );
  }

  private static scopeOf(tuple: readonly string[]): ScopeKind {
    const [module, feature] = tuple;
    if (module === 'platform') return 'platform';
    return SCOPE_WORDS[feature] ?? 'school';
  }
}
