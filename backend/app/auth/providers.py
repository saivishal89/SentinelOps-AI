"""
Provider-specific profile fetchers.
Each function takes an OAuth access token and returns a normalized profile dict:
{
    "provider": str,
    "provider_user_id": str,
    "email": str,
    "name": str,
    "avatar_url": str | None,
    "raw": dict  # original provider response
}
"""
import httpx
from typing import Dict, Any


async def fetch_google_profile(access_token: str) -> Dict[str, Any]:
    """Fetch user profile from Google using access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "provider": "google",
            "provider_user_id": data["sub"],
            "email": data["email"],
            "name": data.get("name", data["email"]),
            "avatar_url": data.get("picture"),
            "raw": data,
        }


async def fetch_github_profile(access_token: str) -> Dict[str, Any]:
    """Fetch user profile from GitHub. Handles private email case."""
    async with httpx.AsyncClient() as client:
        # Get user info
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        # GitHub may not return email in profile — fetch from /user/emails
        email = data.get("email")
        if not email:
            email_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
                timeout=10.0,
            )
            email_resp.raise_for_status()
            emails = email_resp.json()
            primary = next(
                (e for e in emails if e.get("primary")),
                emails[0] if emails else None,
            )
            email = primary["email"] if primary else None

        return {
            "provider": "github",
            "provider_user_id": str(data["id"]),
            "email": email,
            "name": data.get("name") or data.get("login", ""),
            "avatar_url": data.get("avatar_url"),
            "raw": data,
        }


async def fetch_discord_profile(access_token: str) -> Dict[str, Any]:
    """Fetch user profile from Discord."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://discord.com/api/v10/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        # Build avatar URL from Discord CDN
        avatar_url = None
        if data.get("avatar"):
            avatar_url = (
                f"https://cdn.discordapp.com/avatars/{data['id']}/{data['avatar']}.png"
            )

        return {
            "provider": "discord",
            "provider_user_id": data["id"],
            "email": data.get("email"),
            "name": data.get("global_name") or data.get("username", ""),
            "avatar_url": avatar_url,
            "raw": data,
        }


# Registry for easy lookup
PROFILE_FETCHERS = {
    "google": fetch_google_profile,
    "github": fetch_github_profile,
    "discord": fetch_discord_profile,
}
