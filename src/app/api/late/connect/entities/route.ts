import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * GET /api/late/connect/entities
 * Lists entities (pages, organizations, boards, locations) for platform OAuth entity selection.
 * Called by callback-entity-selection.tsx after OAuth redirect for platforms requiring entity selection.
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const tempToken = searchParams.get("tempToken");
  const connectToken = searchParams.get("connectToken");
  const pendingDataToken = searchParams.get("pendingDataToken");

  if (!platform) {
    return NextResponse.json(
      { error: "Missing platform parameter" },
      { status: 400 }
    );
  }

  try {
    const late = await getLateClient();

    // If we have a pendingDataToken, fetch pending OAuth data first
    let resolvedTempToken = tempToken;
    let pendingData: Record<string, unknown> | null = null;

    if (pendingDataToken) {
      const { data, error } = await late.connect.getPendingOAuthData({
        query: { token: pendingDataToken },
      });
      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch pending OAuth data" },
          { status: 500 }
        );
      }
      pendingData = data as Record<string, unknown>;
      resolvedTempToken = (pendingData?.tempToken as string) || tempToken;
    }

    // Fetch entities based on platform
    interface EntityItem {
      id: string;
      name: string;
      picture?: string;
      address?: string;
    }

    let entities: EntityItem[] = [];

    switch (platform) {
      case "facebook": {
        if (!resolvedTempToken) {
          return NextResponse.json({ error: "Missing tempToken" }, { status: 400 });
        }
        const { data, error } = await late.connect.facebook.listFacebookPages({
          query: { profileId, tempToken: resolvedTempToken },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to list Facebook pages" }, { status: 500 });
        }
        const pages = (data as { pages?: Array<{ id: string; name: string; picture?: string }> })?.pages || [];
        entities = pages.map((p) => ({ id: p.id, name: p.name, picture: p.picture }));
        break;
      }

      case "linkedin": {
        // LinkedIn returns orgs in pending data; fetch full details
        const orgIds = pendingData?.organizations
          ? (pendingData.organizations as Array<{ id: string }>).map((o) => o.id).join(",")
          : "";
        if (orgIds && resolvedTempToken) {
          const { data, error } = await late.connect.linkedin.listLinkedInOrganizations({
            query: { orgIds, tempToken: resolvedTempToken },
          });
          if (!error && data) {
            const orgs = (data as { organizations?: Array<{ id: string; vanityName: string; logoUrl?: string }> })?.organizations || [];
            entities = orgs.map((o) => ({ id: o.id, name: o.vanityName, picture: o.logoUrl }));
          }
        }
        // Always add personal account option
        entities.unshift({ id: "personal", name: "Personal Account" });
        break;
      }

      case "pinterest": {
        if (!resolvedTempToken) {
          return NextResponse.json({ error: "Missing tempToken" }, { status: 400 });
        }
        const headers: Record<string, string> = {};
        if (connectToken) {
          headers["X-Connect-Token"] = connectToken;
        }
        const { data, error } = await late.connect.pinterest.listPinterestBoardsForSelection({
          ...(connectToken && { headers: { "X-Connect-Token": connectToken } }),
          query: { profileId, tempToken: resolvedTempToken },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to list Pinterest boards" }, { status: 500 });
        }
        const boards = (data as { boards?: Array<{ id: string; name: string }> })?.boards || [];
        entities = boards.map((b) => ({ id: b.id, name: b.name }));
        break;
      }

      case "googlebusiness": {
        if (!resolvedTempToken) {
          return NextResponse.json({ error: "Missing tempToken" }, { status: 400 });
        }
        const { data, error } = await late.connect.googleBusiness.listGoogleBusinessLocations({
          query: { profileId, tempToken: resolvedTempToken },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to list Google Business locations" }, { status: 500 });
        }
        const locations = (data as { locations?: Array<{ id: string; name: string; address?: string }> })?.locations || [];
        entities = locations.map((l) => ({ id: l.id, name: l.name, address: l.address }));
        break;
      }

      case "snapchat": {
        if (!resolvedTempToken) {
          return NextResponse.json({ error: "Missing tempToken" }, { status: 400 });
        }
        const { data, error } = await late.connect.snapchat.listSnapchatProfiles({
          ...(connectToken && { headers: { "X-Connect-Token": connectToken } }),
          query: { profileId, tempToken: resolvedTempToken },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to list Snapchat profiles" }, { status: 500 });
        }
        const profiles = (data as { profiles?: Array<{ id: string; name: string; picture?: string }> })?.profiles || [];
        entities = profiles.map((p) => ({ id: p.id, name: p.name, picture: p.picture }));
        break;
      }

      default:
        return NextResponse.json(
          { error: `Entity selection not supported for platform: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ entities });
  } catch (err) {
    console.error(`[connect/entities] Error for platform ${platform}:`, err);
    return NextResponse.json(
      { error: "Failed to fetch entities" },
      { status: 500 }
    );
  }
}
