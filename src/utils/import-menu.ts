import {
  FunctionDeclarationSchemaType,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import env from "./env";
import {
  GoogleAIFileManager,
  type FileMetadataResponse,
} from "@google/generative-ai/server";
import { lunchAiResponse } from "../types/schemas";
import Airtable from "airtable";

const fileManager = new GoogleAIFileManager(env.GOOGLE_AI_API_KEY);

const uploadFileToGemini = async (path: string, mimeType: string) => {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
};

const waitForActiveFiles = async (files: FileMetadataResponse[]) => {
  console.log("Waiting for file processing...");
  for (const name of files.map((file) => file.name)) {
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name);
    }
    if (file.state !== "ACTIVE") {
      throw Error(`File ${file.name} failed to process`);
    }
  }
  console.log("...all files ready\n");
};

export const importMenu = async (PDFurl: string) => {
  const PDFrequest = await fetch(PDFurl);
  const PDFblob = await PDFrequest.blob();
  await Bun.write("nom-nom-nom/food.pdf", PDFblob);

  const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction:
      "you are the lunch lady, a stereotypical really really excited lunch lady, and you are talking to a large group of children. when you receive a lunch menu, return the lunch for every day it shows, quickly explaining the options for the day. name every option specific to the day, exactly as it appears on the menu, and surround it with * characters when you do. if there is no lunch provided for the day, explain why. provide the date for that day in YYYY-MM-DD format. be sure to include every day on the menu, and match it with the correct date.",
    generationConfig: {
      temperature: 2,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          response: {
            type: FunctionDeclarationSchemaType.ARRAY,
            //@ts-ignore
            items: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                },
                text: {
                  type: "string",
                },
              },
              required: ["date", "text"],
            },
          },
        },
        required: ["response"],
      },
    },
  });

  const files = [
    await uploadFileToGemini("nom-nom-nom/food.pdf", "application/pdf"),
  ];
  await waitForActiveFiles(files);

  const responseRequest = await model.generateContent([
    {
      fileData: {
        mimeType: files[0].mimeType,
        fileUri: files[0].uri,
      },
    },
  ]);

  const response = lunchAiResponse.parse(
    JSON.parse(responseRequest.response.text())
  ).response;

  const airtable = new Airtable({
    apiKey: env.AIRTABLE_KEY,
  }).base("appZ6Cn76GFuSrjdd");

  for (const { date, text } of response) {
    await airtable.table("lunch").create({
      date,
      lunch: text,
    });
  }

  console.log("Menu imported successfully");
};
