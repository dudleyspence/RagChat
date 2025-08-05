
import OpenAI from "openai"
import "dotenv/config"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { dentistData } from "../fake_data/data"
import { v4 as uuidv4 } from 'uuid';
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";


const {PINECONE_INDEX, OPENAI_API_KEY, PINECONE_API_KEY} = process.env

const pinecone = new PineconeClient({
  apiKey: PINECONE_API_KEY,
});


const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
})



const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
})



export function chunkDentistData(dentistData: any): Document[] {
  const documents: Document[] = [];

  const baseMeta = { clinicId: dentistData.clinicId };

  // Clinic description
  documents.push(new Document({
    pageContent: `${dentistData.name}: ${dentistData.description}`,
    metadata: {
      ...baseMeta,
      type: "description"
    }
  }));

  // Services
  for (const service of dentistData.services) {
    documents.push(new Document({
      pageContent: `Service: ${service.title}. Description: ${service.description}. Price: £${service.price}.`,
      metadata: {
        ...baseMeta,
        type: "service",
        serviceId: service.id,
        serviceTitle: service.title
      }
    }));
  }

  // Opening hours
  const hoursText = Object.entries(dentistData.openingHours)
    .map(([day, hours]) => `${day}: ${hours}`)
    .join(", ");

  documents.push(new Document({
    pageContent: `Opening hours for ${dentistData.name}: ${hoursText}`,
    metadata: {
      ...baseMeta,
      type: "openingHours"
    }
  }));

  // Languages
  documents.push(new Document({
    pageContent: `${dentistData.name} staff speak: ${dentistData.languagesSpoken.join(", ")}`,
    metadata: {
      ...baseMeta,
      type: "languages"
    }
  }));

  // Payment methods
  documents.push(new Document({
    pageContent: `${dentistData.name} accepts: ${dentistData.paymentMethods.join(", ")}`,
    metadata: {
      ...baseMeta,
      type: "paymentMethods"
    }
  }));

  return documents;
}


// to find the dimension size of the embedding model, we can use the openai api docs
// https://platform.openai.com/docs/guides/embeddings/embedding-models
// in our case we will be using text-embedding-3-small

// metric is the method used to calculate the similarity between two vectors
// we will be using cosine similarity


const loadSampleData = async () => {
  const pineconeIndex = pinecone.Index(PINECONE_INDEX!);
  const documents = chunkDentistData(dentistData);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: pineconeIndex,
    maxConcurrency: 5,
  });
  // await pineconeIndex.deleteAll();
  await vectorStore.addDocuments(documents);

};

loadSampleData()



