import { timingSafeEqual } from "crypto";
import { z } from "zod";

type IntegrationClient = {
  name: string;
  apiKey: string;
  divisionIds: string[];
};

const clientsSchema = z.array(
  z.object({
    name: z.string().min(1),
    apiKey: z.string().min(16),
    divisionIds: z.array(z.string().min(1)).min(1),
  }),
);

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function parseApiKey(request: Request) {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const xApiKey = request.headers.get("x-integration-key")?.trim();
  if (xApiKey) {
    return xApiKey;
  }

  return "";
}

function getConfiguredClients(): IntegrationClient[] {
  const raw = process.env.INTEGRATION_CLIENTS_JSON;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return clientsSchema.parse(parsed);
  } catch {
    return [];
  }
}

export function authenticateIntegration(request: Request, divisionId: string) {
  const apiKey = parseApiKey(request);
  if (!apiKey) {
    return { ok: false as const, status: 401, error: "Missing integration API key" };
  }

  const clients = getConfiguredClients();
  if (clients.length === 0) {
    return {
      ok: false as const,
      status: 503,
      error: "Integration API is not configured",
    };
  }

  const client = clients.find((item) => safeCompare(item.apiKey, apiKey));
  if (!client) {
    return { ok: false as const, status: 401, error: "Invalid integration API key" };
  }

  if (!client.divisionIds.includes(divisionId)) {
    return {
      ok: false as const,
      status: 403,
      error: "This API key is not allowed for the requested division",
    };
  }

  return { ok: true as const, clientName: client.name };
}

export function authenticateIntegrationClient(request: Request) {
  const apiKey = parseApiKey(request);
  if (!apiKey) {
    return { ok: false as const, status: 401, error: "Missing integration API key" };
  }

  const clients = getConfiguredClients();
  if (clients.length === 0) {
    return {
      ok: false as const,
      status: 503,
      error: "Integration API is not configured",
    };
  }

  const client = clients.find((item) => safeCompare(item.apiKey, apiKey));
  if (!client) {
    return { ok: false as const, status: 401, error: "Invalid integration API key" };
  }

  return {
    ok: true as const,
    clientName: client.name,
    divisionIds: client.divisionIds,
  };
}

export function resolveIntegrationDivision(
  requestedDivisionId: string | null,
  allowedDivisionIds: string[],
) {
  if (requestedDivisionId) {
    if (!allowedDivisionIds.includes(requestedDivisionId)) {
      return {
        ok: false as const,
        status: 403,
        error: "This API key is not allowed for the requested division",
      };
    }

    return { ok: true as const, divisionId: requestedDivisionId };
  }

  if (allowedDivisionIds.length === 1) {
    return { ok: true as const, divisionId: allowedDivisionIds[0] };
  }

  return {
    ok: false as const,
    status: 400,
    error: "divisionId query param is required for this API key",
  };
}

export function isDivisionAllowed(allowedDivisionIds: string[], divisionId: string) {
  return allowedDivisionIds.includes(divisionId);
}
