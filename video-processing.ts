import { mkdir } from "node:fs/promises";

async function downloadVideo(videoId: string) {
  const full_url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    "--verbose",
    "--no-geo-bypass",
    "--cookies",
    "cookies.txt",
    "--no-check-certificate",
    "--recode-video",
    "mp4",
    "-o",
    `./downloads/${videoId}.mp4`,
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
  const inputPath = `./downloads/${videoId}.mp4`;
  const outputDir = `./downloads/${videoId}_frames`;
  await mkdir(outputDir, { recursive: true });

  const ffmpegArgs = [
    "-y",
    "-sseof",
    "-15",
    "-t",
    "15",
    "-i",
    inputPath,
    "-vf",
    "fps=0.5",
    `${outputDir}/%05d.jpg`,
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

// downloadVideo("Rvj-o2fNFWk");
processVideo("Rvj-o2fNFWk");
