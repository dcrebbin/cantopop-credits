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

downloadVideo("Rvj-o2fNFWk");
