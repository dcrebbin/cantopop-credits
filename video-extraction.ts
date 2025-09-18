import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { generateJson } from ".";
import { RAW_LOCATIONS } from "./constants";
import { extractYouTubeId } from "./utils";
import fs from "node:fs";
import z from "zod";
import { google } from "@ai-sdk/google";

const prompt = ``;

function getAiProvider(provider: string) {
  if (provider === "openai") {
    return openai("gpt-4.1-mini");
  }
  return google("gemini-2.5-flash");
}

export async function extractData(videoId: string, provider: string) {
  let videoPath = `./downloads/${videoId}.mp4`;
  if (!(await fs.existsSync(videoPath))) {
    videoPath = `./downloads/${videoId}.webm`;
    if (!(await fs.existsSync(videoPath))) {
      console.log(`Video ${videoId} does not exist`);
      return;
    }
  }

  console.log(`Processing video: ${videoId}`);

  fs.mkdirSync(`./data/${videoId}/data`, { recursive: true });

  const totalFrames = await fs.readdirSync(`./downloads/${videoId}_frames`)
    .length;

  for (let i = 1; i < totalFrames + 1; i++) {
    console.log(`Processing frame ${i} of ${totalFrames}`);
    const startTime = new Date();

    const imagePath = `./downloads/${videoId}_frames/${i}.jpg`;
    if (!(await fs.existsSync(imagePath))) {
      console.log(`Image ${i} does not exist`);
      continue;
    }

    const imageBuffer = await fs.readFileSync(imagePath);

    const { text } = await generateText({
      model: getAiProvider(provider),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the text and convert it into a json object. Ensure the keys are in camelCase. If the text is not clear/too dim, return an empty object with nothing else. If you cannot find any text, return an empty object with nothing else. ONLY RETURN JSON.
  <example>
  {
    "exampleRole1": ["example person 1", "example person 2", "example person 3"],
    "exampleRole2": ["example person 1"],
  }
  </example>`,
            },
            {
              image: imageBuffer,
              type: "image",
            },
          ],
        },
      ],
    });

    console.log(text);
    const cleanedText = text.replace(/```json\n|```/g, "");
    const object = JSON.parse(cleanedText);
    //create the directory if it doesn't exist

    await fs.writeFileSync(
      `./data/${videoId}/data/${i}.json`,
      JSON.stringify(object, null, 2)
    );
    const endTime = new Date();
    console.log(`Time taken: ${endTime.getTime() - startTime.getTime()}ms`);
  }
  const collatedData = await collateData(videoId);
  await fs.writeFileSync(
    `./data/${videoId}/data/collated.json`,
    JSON.stringify(collatedData, null, 2)
  );

  const cleanedData = await generateJson(prompt, JSON.stringify(collatedData));
  console.log(cleanedData);
}

async function collateData(videoId: string) {
  const data: Record<string, string[]> = {};
  for (let i = 1; i < 13; i++) {
    try {
      const jsonPath = `./data/${videoId}/data/${i}.json`;
      if (!(await fs.existsSync(jsonPath))) {
        continue;
      }
      const content = fs.readFileSync(jsonPath, "utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        continue;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        continue;
      }

      for (const [role, contributors] of Object.entries(
        parsed as Record<string, unknown>
      )) {
        if (!role) continue;

        let contributorList: string[] = [];
        if (Array.isArray(contributors)) {
          contributorList = (contributors as unknown[])
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (typeof contributors === "string") {
          const normalized = contributors.trim();
          if (normalized) contributorList = [normalized];
        } else {
          continue;
        }

        if (contributorList.length === 0) continue;

        if (data[role]) {
          data[role] = [...new Set([...data[role], ...contributorList])];
        } else {
          data[role] = [...new Set(contributorList)];
        }
      }
    } catch {
      // Unexpected error for this frame; continue with the rest
      continue;
    }
  }

  for (const [role, contributors] of Object.entries(data)) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of contributors as string[]) {
      const cleaned = raw.trim().replace(/\s+/g, " ");
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cleaned);
      }
    }
    data[role] = unique;
  }

  return data;
}

function main() {
  const args = process.argv.slice(2);

  let aiProvider = "openai";
  let videoId = "";

  for (const arg of args) {
    if (arg.startsWith("--ai=")) {
      aiProvider = arg.split("--ai=")[1] ?? "openai";
    } else if (arg.startsWith("--videoId=")) {
      videoId = arg.split("--videoId=")[1] ?? "";
    }
  }

  if (!videoId) {
    for (let i = 0; i < 1; i++) {
      const rawLocation = RAW_LOCATIONS[i];
      if (!rawLocation || rawLocation.contributors !== undefined) {
        continue;
      }
      const videoId = extractYouTubeId(rawLocation?.url ?? "") ?? "";

      if (!videoId) {
        continue;
      }
      extractData(videoId, aiProvider);
    }
    return;
  }
  extractData(videoId, aiProvider);
}

main();
