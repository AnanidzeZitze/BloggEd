import { google } from "googleapis";
import fs from "fs";
import path from "path";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getGoogleCredentials(): GoogleCredentials {
  // 1. Try Loading from Environment Variables (Cloud Native)
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/auth/google/callback`;

  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      redirectUri: envRedirectUri,
    };
  }

  // 2. Fallback to Local JSON (Developer Friendly)
  const secretPath = path.join(process.cwd(), "client_secret.json");
  if (fs.existsSync(secretPath)) {
    try {
      const secretData = JSON.parse(fs.readFileSync(secretPath, "utf-8"));
      const installed = secretData.installed || secretData.web;
      if (installed) {
        return {
          clientId: installed.client_id,
          clientSecret: installed.client_secret,
          redirectUri: installed.redirect_uris[0] || envRedirectUri,
        };
      }
    } catch (err) {
      console.error("Error reading client_secret.json in helper:", err);
    }
  }

  throw new Error(
    "Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or provide client_secret.json."
  );
}

export function getOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
