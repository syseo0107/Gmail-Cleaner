import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialize Gemini client using backend credentials
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please make sure to configure it in the Secrets panel of your AI Studio settings.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper: Extract header value
function getHeaderValue(headers: { name: string; value: string }[], name: string): string {
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : "";
}

// Helper: Extract http/https unsubscribe link from List-Unsubscribe header
function extractUnsubscribeUrl(headerVal: string): string | null {
  if (!headerVal) return null;
  // Try to find a URL matching http/https inside brackets
  const match = headerVal.match(/<(https?:\/\/[^>]+)>/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback to any standalone http/https URL
  const matchNoBrackets = headerVal.match(/(https?:\/\/[^\s,>]+)/);
  if (matchNoBrackets && matchNoBrackets[1]) {
    return matchNoBrackets[1];
  }
  return null;
}

// 1. Fetch and Analyze emails API
app.get("/api/emails", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(412).json({ error: "Missing authorization token" });
    return;
  }

  try {
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 100;
    
    // Step 1: List message IDs from INBOX (avoid already trashed/draft messages)
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=label:INBOX`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: authHeader },
    });

    if (!listRes.ok) {
      const errorText = await listRes.text();
      throw new Error(`Gmail API List error: ${listRes.status} ${errorText}`);
    }

    const listData = await listRes.json() as { messages?: { id: string; threadId: string }[] };
    if (!listData.messages || listData.messages.length === 0) {
      res.json({ emails: [] });
      return;
    }

    // Step 2: Fetch metadata details for each message in parallel
    const emailsDetailsProms = listData.messages.map(async (msg) => {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=List-Unsubscribe`;
        const detailRes = await fetch(detailUrl, {
          headers: { Authorization: authHeader },
        });

        if (!detailRes.ok) {
          return null;
        }

        const detailData = await detailRes.json() as {
          id: string;
          snippet: string;
          payload: { headers: { name: string; value: string }[] };
        };

        const headers = detailData.payload?.headers || [];
        const fromVal = getHeaderValue(headers, "From");
        const subjectVal = getHeaderValue(headers, "Subject");
        const dateVal = getHeaderValue(headers, "Date");
        const unsubscribeHeader = getHeaderValue(headers, "List-Unsubscribe");
        const unsubscribeUrlVal = extractUnsubscribeUrl(unsubscribeHeader);

        return {
          id: detailData.id,
          from: fromVal,
          subject: subjectVal,
          date: dateVal,
          snippet: detailData.snippet || "",
          unsubscribeUrl: unsubscribeUrlVal,
        };
      } catch (err) {
        console.error(`Error fetching email details for ${msg.id}:`, err);
        return null;
      }
    });

    const emailsDetails = (await Promise.all(emailsDetailsProms)).filter(
      (email): email is NonNullable<typeof email> => email !== null
    );

    if (emailsDetails.length === 0) {
      res.json({ emails: [] });
      return;
    }

    // Step 3: Analyze with Gemini 3.5 Flash to identify unnecessary emails
    const emailSummaryForAI = emailsDetails.map((email, idx) => {
      return `[Index: ${idx}, ID: ${email.id}]
Sender: ${email.from}
Subject: ${email.subject}
Snippet: ${email.snippet}
---`;
    }).join("\n");

    const prompt = `You are a Gmail Smart Cleaner AI. You are helping the user identify unnecessary emails to free up bulk space.
Analyze the following list of emails. For each email, classify it and decide if it is "unnecessary" (safe to delete, such as commercial advertisements, marketing lists, automated generic system alerts, newsletters, promotional material, spam, and unrequited notifications) or "important" (requires human input/reaction, contains dynamic information, invoices/receipts of recent purchases, dynamic personal chats, sign-in codes, flight bookings, or work-related correspondences).

Emails to analyze:
${emailSummaryForAI}

Return a structured JSON output with a classification list mapped by ID. Make sure to double check that you include reasons in Korean ("reason" field in Korean language only) so that the user can read the insights easily!`;

    const geminiRes = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "The exact email ID analyzed." },
                  category: {
                    type: Type.STRING,
                    description: "Category: 'Newsletter', 'Promotion', 'Social', 'Notification', 'Important/Personal'",
                  },
                  unnecessary: {
                    type: Type.BOOLEAN,
                    description: "True if safe to delete/trash. False if important to keep.",
                  },
                  reason: {
                    type: Type.STRING,
                    description: "A short 1-sentence friendly confirmation/reason in Korean explaining why this email was classified as such.",
                  },
                  cleanupActionSuggested: {
                    type: Type.STRING,
                    description: "Action suggestion in Korean, e.g., '수신 거부 및 삭제', '단순 삭제 및 정리', '안전하게 보관'.",
                  }
                },
                required: ["id", "category", "unnecessary", "reason", "cleanupActionSuggested"],
              },
            },
          },
          required: ["classifications"],
        },
      },
    });

    const aiResponseText = geminiRes.text;
    if (!aiResponseText) {
      throw new Error("Empty classification from Gemini AI");
    }

    const aiData = JSON.parse(aiResponseText.trim()) as {
      classifications: {
        id: string;
        category: string;
        unnecessary: boolean;
        reason: string;
        cleanupActionSuggested: string;
      }[];
    };

    // Step 4: Map AI classifications back to local details list
    const enrichedEmails = emailsDetails.map((email) => {
      const classification = aiData.classifications?.find((c) => c.id === email.id);
      return {
        ...email,
        category: classification?.category || "Unknown",
        unnecessary: classification !== undefined ? classification.unnecessary : false,
        reason: classification?.reason || "해당 메일 유형을 분류할 수 없습니다.",
        cleanupActionSuggested: classification?.cleanupActionSuggested || "보관",
      };
    });

    res.json({ emails: enrichedEmails });
  } catch (error: any) {
    console.error("Error in /api/emails:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve or analyze emails." });
  }
});

// 2. Batch Trash emails API (Moves items to Trash safely)
app.post("/api/trash", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(412).json({ error: "Missing authorization token" });
    return;
  }

  const { ids } = req.body as { ids: string[] };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Missing email IDs for trashing" });
    return;
  }

  try {
    const trashUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify";
    const trashRes = await fetch(trashUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids,
        addLabelIds: ["TRASH"],
        removeLabelIds: ["INBOX"],
      }),
    });

    if (!trashRes.ok) {
      const errorText = await trashRes.text();
      throw new Error(`Gmail API Batch Trash error: ${trashRes.status} ${errorText}`);
    }

    res.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error("Error trashing emails:", error);
    res.status(500).json({ error: error.message || "Failed to batch trash emails." });
  }
});

// 3. Mount Vite Dev Server / Serve Dist Index for Prod
async function setupViteServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupViteServer();
