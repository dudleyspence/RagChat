import { streamText } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

const {
  ASTRA_DB_COLLECTION,
  ASTRA_DB_KEYSPACE,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_KEYSPACE });

export const maxDuration = 30;
export async function POST(req: Request) {
  const { messages, lead } = await req.json();
  const latestMessage = messages[messages.length - 1]?.content;
  if (!latestMessage) {
    return new Response("No message provided", { status: 400 });
  }

  let docContext = "";

  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: latestMessage,
    encoding_format: "float",
  });

  try {
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    const cursor = collection.find(null, {
      sort: {
        $vector: embedding.data[0].embedding,
      },
      limit: 10,
    });
    // our potential 10 documents
    const documents = await cursor.toArray();

    const docsMap = documents?.map((doc) => doc.text);

    docContext = JSON.stringify(docsMap);
  } catch (error) {
    console.error("Error fetching documents:", error);
    docContext = "";
  }


  // Build dynamic user info
  const userInfo = `
  PATIENT INFORMATION:
  - First name: ${lead.firstName}
  - Treatment of interest: ${lead.treatment}
  - Mobile number: ${lead.mobile}
  - Lead submitted: ${new Date(lead.submittedAt).toLocaleDateString("en-GB", {
    dateStyle: "long",
  })}
  `;

  const currentDate = new Date().toISOString().split("T")[0];


  const basePrompt = `
  Who: You are a booking coordinator for a dental practice that focuses on cosmetic dentistry, notably Invisalign, composite bonding, veneers, and smile makeovers.
  
  Your objective is to follow up with leads via SMS after they've expressed interest in one of our treatments. Your job is to qualify the lead and schedule them for a free consultation, which requires a fully refundable deposit.
  
  CURRENT DATE: ${currentDate}
  
  When suggesting appointment slots or using dates:
  - Use ${currentDate} as reference
  - Only offer slots at least 2 days in the future
  - Format dates in UK style (e.g. 10th June)
  - Use 12-hour time format with AM/PM for user-facing responses
  - Use ISO 8601 format for tool calls
  
  RESPONSE FORMAT:
  You MUST return responses as JSON in the following structure:
  
  {
    "response": "Your message to the user",
    "thought_process": {
      "reasoning": "Why you’re responding this way",
      "plan": "What you’re trying to do next",
      "critique": "Any weaknesses or edge cases you’re aware of"
    }
  }
  
  "response" rules:
  - 280 character max
  - Conversational SMS tone
  - No exclamation marks or emojis
  - Use contractions ("we're", "can't", etc)
  - Use "we" instead of "I"
  - UK English spellings
  - Avoid generic phrases, guarantees, or overly polite fluff
  - Do not thank the user
  - Do not ask multiple questions at once
  
  TOOLS:
  If asked about bookings:
  1. Qualify the lead to identify the correct treatment
  2. Use the \`check_availability\` tool with the right service ID
  3. Offer 2–3 available slots spaced across different days/times
  4. Once a slot is chosen and the deposit hasn't been discussed, explain it using the exact script provided
  5. After confirmation, use the \`generate_booking_link\` tool with their mobile number, service ID, and selected slot
  6. Share the link and confirm it reserves their appointment once paid
  
  Use markdown syntax if needed. Do not return images or HTML.
  `;


  const systemPrompt = `${basePrompt}\n\n${userInfo}\n\nSERVICES & LOCATIONS CONTEXT:\n${docContext}`;


  const openAiMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: openAiMessages,
    temperature: 0.7,
  });

  const message = result.choices[0]?.message?.content;
  return new Response(message, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

}
