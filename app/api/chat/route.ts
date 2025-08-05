import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { lead } from "../../fake_data/data";
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";



const {
  OPENAI_API_KEY,
  PINECONE_INDEX,
} = process.env;

const pinecone = new PineconeClient();
const pineconeIndex = pinecone.Index(PINECONE_INDEX!);


const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY });
const model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.7, openAIApiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  console.log("Received request body:", JSON.stringify(body, null, 2));
  
  const { messages } = body;
  
  if (!messages || !Array.isArray(messages)) {
    console.log("Invalid messages format:", messages);
    return new Response("Invalid messages format", { status: 400 });
  }
  
  const latestMessage = messages[messages.length - 1]?.content;
  if (!latestMessage) {
    console.log("No message content found");
    return new Response("No message provided", { status: 400 });
  }

  let docContext = "";
  try {


    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: pineconeIndex,
        maxConcurrency: 5,
      });
 

      const filter = { clinicId: lead.clinicId };

      console.log(filter, "<<<<<<< filter");

      const similaritySearchResults = await vectorStore.similaritySearch(
        latestMessage,
        5,
        
      );    

    console.log(similaritySearchResults, "<<<<<<< results");
    docContext = similaritySearchResults.map((doc) => doc.pageContent).join("\n\n");
  } catch (error) {
    console.error("Qdrant error:", error);
    docContext = "Unable to retrieve documents at this time.";
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const submittedDateFormatted = new Date(lead.submittedAt).toLocaleDateString("en-GB", {
    dateStyle: "long",
  });

  const userInfo = `
PATIENT INFORMATION:
- First name: ${lead.firstName}
- Treatment of interest: ${lead.treatment}
- Mobile number: ${lead.mobile}
- Lead submitted: ${submittedDateFormatted}
`;
const systemPrompt = `
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

{{
  "response": "Your message to the user",
  "thought_process": {{
    "reasoning": "Why you’re responding this way",
    "plan": "What you’re trying to do next",
    "critique": "Any weaknesses or edge cases you’re aware of"
  }}
}}

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
2. Use the check_availability tool with the right service ID
3. Offer 2–3 available slots spaced across different days/times
4. Once a slot is chosen and the deposit hasn't been discussed, explain it using the exact script provided
5. After confirmation, use the generate_booking_link tool with their mobile number, service ID, and selected slot
6. Share the link and confirm it reserves their appointment once paid

PATIENT INFO:
${userInfo}

SERVICES & LOCATIONS CONTEXT:
${docContext}
`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ...messages.filter((m: any) => m.content).map((m: any) => [m.role, m.content] as [string, string]),
  ]);

  const chain = RunnableSequence.from([
    async () => ({}), 
    prompt,
    model,
  ]);

  const response = await chain.invoke({});
  const content = response.content;

  return new Response(JSON.stringify(content), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}