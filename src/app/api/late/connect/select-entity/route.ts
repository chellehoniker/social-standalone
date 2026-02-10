import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * POST /api/late/connect/select-entity
 * Selects an entity (page, organization, board, location) to complete OAuth connection.
 * Called by callback-client.tsx after user selects an entity from the list.
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  let body: {
    platform?: string;
    entityId?: string;
    profileId?: string;
    tempToken?: string;
    userProfile?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { platform, entityId, tempToken, userProfile } = body;

  if (!platform || !entityId) {
    return NextResponse.json(
      { error: "Missing required fields: platform, entityId" },
      { status: 400 }
    );
  }

  if (!tempToken) {
    return NextResponse.json(
      { error: "Missing tempToken" },
      { status: 400 }
    );
  }

  try {
    const late = await getLateClient();

    // Parse userProfile if it's a JSON string
    let parsedUserProfile: Record<string, unknown> | undefined;
    if (userProfile) {
      try {
        parsedUserProfile = typeof userProfile === "string"
          ? JSON.parse(userProfile)
          : (userProfile as unknown as Record<string, unknown>);
      } catch {
        parsedUserProfile = undefined;
      }
    }

    switch (platform) {
      case "facebook": {
        const { error } = await late.connect.facebook.selectFacebookPage({
          body: {
            profileId,
            pageId: entityId,
            tempToken,
            ...(parsedUserProfile && { userProfile: parsedUserProfile }),
          },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to select Facebook page" }, { status: 500 });
        }
        break;
      }

      case "linkedin": {
        const isPersonal = entityId === "personal";
        const { error } = await late.connect.linkedin.selectLinkedInOrganization({
          body: {
            profileId,
            tempToken,
            accountType: isPersonal ? "personal" : "organization",
            ...(parsedUserProfile && { userProfile: parsedUserProfile }),
            ...(!isPersonal && { selectedOrganization: { id: entityId } }),
          },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to select LinkedIn account" }, { status: 500 });
        }
        break;
      }

      case "pinterest": {
        const { error } = await late.connect.pinterest.selectPinterestBoard({
          body: {
            profileId,
            boardId: entityId,
            tempToken,
            ...(parsedUserProfile && { userProfile: parsedUserProfile }),
          },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to select Pinterest board" }, { status: 500 });
        }
        break;
      }

      case "googlebusiness": {
        const { error } = await late.connect.googleBusiness.selectGoogleBusinessLocation({
          body: {
            profileId,
            locationId: entityId,
            tempToken,
            ...(parsedUserProfile && { userProfile: parsedUserProfile }),
          },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to select Google Business location" }, { status: 500 });
        }
        break;
      }

      case "snapchat": {
        const { error } = await late.connect.snapchat.selectSnapchatProfile({
          body: {
            profileId,
            publicProfileId: entityId,
            tempToken,
            ...(parsedUserProfile && { userProfile: parsedUserProfile }),
          },
        });
        if (error) {
          return NextResponse.json({ error: "Failed to select Snapchat profile" }, { status: 500 });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Entity selection not supported for platform: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[connect/select-entity] Error for platform ${platform}:`, err);
    return NextResponse.json(
      { error: "Failed to complete entity selection" },
      { status: 500 }
    );
  }
}
