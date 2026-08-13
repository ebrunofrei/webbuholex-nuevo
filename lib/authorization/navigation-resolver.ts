import "server-only";

import type { NavigationItem } from "@/types/navigation";
import type { WorkspaceSession } from "@/types/auth";
import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";

export async function resolveAuthorizedNavigation(
  items: readonly NavigationItem[],
  session: WorkspaceSession,
  repository: OperatorAuthorizationRepository
): Promise<NavigationItem[]> {
  const resolvedItems: NavigationItem[] = [];

  for (const item of items) {
    if (item.visibility === "hidden") {
      continue;
    }

    if (item.requiredCapability) {
      const authResult = await resolveTrustedAdminPrincipal(
        session,
        item.requiredCapability,
        repository
      );

      if (authResult.kind !== "authorized") {
        continue;
      }
    }

    // Exclude requiredCapability from the client payload
    const clientSafeItem = { ...item };
    delete clientSafeItem.requiredCapability;
    resolvedItems.push(clientSafeItem as NavigationItem);
  }

  return resolvedItems;
}
