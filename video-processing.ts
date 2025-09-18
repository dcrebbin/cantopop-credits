import { mkdir } from "node:fs/promises";
import { RAW_LOCATIONS } from "./constants";
import { extractYouTubeId } from "./utils";
import fs from "node:fs";
import { extractData } from "./video-extraction";
function resolveDownloadedFilePath(videoId: string): string | null {
  const downloadsDir = "./downloads";
  if (!fs.existsSync(downloadsDir)) {
    return null;
  }
  const entries = fs.readdirSync(downloadsDir);
  const match = entries.find((name) => name.startsWith(`${videoId}.`));
  return match ? `${downloadsDir}/${match}` : null;
}
async function getVideoDurationSeconds(
  fullUrl: string
): Promise<number | null> {
  const proc = Bun.spawn(
    ["./modules/yt-dlp", "--print", "%(duration)s", "--skip-download", fullUrl],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  const stdoutText = await new Response(proc.stdout).text();
  await proc.exited;

  const raw = stdoutText.trim().split("\n").pop() ?? "";
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parts = raw.split(":").map((p) => Number(p));
  if (parts.every((n) => Number.isFinite(n))) {
    let total = 0;
    for (const part of parts) {
      total = total * 60 + part;
    }
    return total;
  }
  return null;
}

async function downloadVideo(videoId: string) {
  //check if the video already exists
  const existing = resolveDownloadedFilePath(videoId);
  if (existing) {
    console.log(`Video ${videoId} already exists at ${existing}`);
    return;
  }

  const full_url = `https://www.youtube.com/watch?v=${videoId}`;
  const durationSeconds = await getVideoDurationSeconds(full_url);
  const startSeconds =
    durationSeconds !== null && durationSeconds > 20 ? durationSeconds - 20 : 0;

  console.log(
    `Downloading video ${videoId} from ${full_url} starting at ${startSeconds}`
  );

  const args = [
    "--verbose",
    "--cookies-from-browser",
    "brave",
    // "--geo-bypass",
    // "--geo-bypass-country",
    // "US",
    "--download-sections",
    `*${startSeconds}-`,
    // "-f",
    // "bv",
    // "625",
    // "--list-formats",
    // "--extractor-args",
    // "youtube:player_client=ios",
    "-o",
    `./downloads/${videoId}.%(ext)s`,
    full_url,
  ];

  const proc = Bun.spawn(["./modules/yt-dlp", ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`yt-dlp exited with code ${exitCode}`);
  }
}

async function processVideo(videoId: string) {
  const inputPath = resolveDownloadedFilePath(videoId);
  if (!inputPath) {
    throw new Error(`Downloaded file for ${videoId} not found in ./downloads`);
  }
  const outputDir = `./downloads/${videoId}_frames`;

  const outputDirExists = await fs.existsSync(outputDir);

  console.log(`Output directory ${outputDir} exists: ${outputDirExists}`);
  if (outputDirExists) {
    console.log(`Output directory ${outputDir} already exists`);
    return;
  }

  await mkdir(outputDir, { recursive: true });

  let videoPath = `./downloads/${videoId}.webm`;
  if (!(await fs.existsSync(videoPath))) {
    videoPath = `./downloads/${videoId}.mp4`;

    if (!(await fs.existsSync(videoPath))) {
      throw new Error(`Video ${videoId} does not exist`);
    }
  }

  const ffmpegArgs = [
    "-y",
    "-sseof",
    "-20",
    "-t",
    "20",
    "-i",
    videoPath,
    "-vf",
    "fps=1",
    `${outputDir}/%01d.jpg`,
  ];

  const proc = Bun.spawn(["ffmpeg", ...ffmpegArgs], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`ffmpeg exited with code ${exitCode}`);
  }
}

async function main() {
  for (let i = 0; i < RAW_LOCATIONS.length; i++) {
    const rawLocation = RAW_LOCATIONS[i];
    if (!rawLocation) {
      continue;
    }

    if (rawLocation.contributors !== undefined) {
      continue;
    }

    const extracted = extractYouTubeId(rawLocation.url);
    if (extracted === null) {
      continue;
    }

    const existingPath = resolveDownloadedFilePath(extracted);

    if (existingPath && (await fs.existsSync(existingPath))) {
      console.log(`Video ${extracted} already exists`);
      await processVideo(extracted);
    } else {
      try {
        await downloadVideo(extracted);
        await processVideo(extracted);
      } catch (e) {
        console.error(`Error processing video ${extracted}: ${e}`);
      }
    }
  }
}

main();
//

// await downloadVideo("AgEkYyeu3Jg");
// await processVideo("AgEkYyeu3Jg");
// extractData();
