import "server-only";
import { cache } from "react";
import { db, type Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import { buildSettings, SETTINGS_GROUPS, type Settings, type SettingsGroup } from "./settings-schema";

export async function loadSettings(client: Db = db): Promise<Settings> {
  return buildSettings(await client.setting.findMany());
}

export const getSettings = cache(() => loadSettings());

let publicCompany: { value: Settings["company"]; at: number } | undefined;

/** For the public site: short cache, and it never fails if the database is unreachable. */
export async function getPublicCompany(): Promise<Settings["company"]> {
  if (publicCompany && Date.now() - publicCompany.at < 30_000) return publicCompany.value;
  let value: Settings["company"];
  try {
    value = (await loadSettings()).company;
  } catch {
    value = publicCompany?.value ?? buildSettings([]).company;
  }
  publicCompany = { value, at: Date.now() };
  return value;
}

export async function updateSettings<G extends SettingsGroup>(
  group: G,
  value: Settings[G],
  ctx: ActionContext,
) {
  const before = (await loadSettings())[group];
  const parsed = SETTINGS_GROUPS[group].parse(value);
  await db.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key: group },
      create: { key: group, value: parsed },
      update: { value: parsed },
    });
    await audit(
      {
        action: "settings.update",
        actorId: ctx.user.id,
        targetType: "Setting",
        targetId: group,
        before,
        after: parsed,
        meta: ctx.meta,
      },
      tx,
    );
  });
  if (group === "company") publicCompany = undefined;
}
