const MIRAKC_API_URL = Deno.env.get("MIRAKC_API_URL") ?? "";
const LISTEN_PORT = Number(Deno.env.get("LISTEN_PORT") ?? "8001");

type Quality = "480p" | "720p" | "1024p";
type EncoderName = "h264_v4l2m2m" | "libx264";

const qualitySettings: Record<Quality, { scale: string; bitrate: string }> = {
  "480p": { scale: "-2:480", bitrate: "1000k" },
  "720p": { scale: "-2:720", bitrate: "2000k" },
  "1024p": { scale: "-2:1024", bitrate: "3500k" },
};

let cachedEncoder: EncoderName | null = null;
let detectingPromise: Promise<EncoderName | null> | null = null;

function buildVideoEncoderArgs(
  encoder: EncoderName,
  bitrate: string,
): string[] {
  if (encoder === "h264_v4l2m2m") {
    return ["-c:v", "h264_v4l2m2m", "-b:v", bitrate, "-g", "15"];
  }
  return [
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-b:v",
    bitrate,
    "-g",
    "15",
    "-sc_threshold",
    "0",
  ];
}

function pipeStderr(
  src: ReadableStream<Uint8Array>,
  prefix: string,
): void {
  (async () => {
    const reader = src.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line) {
          console.error(`${prefix} ${line}`);
        }
      }
    }
    buf += decoder.decode();
    if (buf) {
      console.error(`${prefix} ${buf}`);
    }
  })().catch(() => {});
}

async function probeEncoder(encoder: EncoderName): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const child = new Deno.Command("ffmpeg", {
      args: [
        "-hide_banner",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=size=320x240:rate=10:duration=1",
        ...buildVideoEncoderArgs(encoder, "500k"),
        "-frames:v",
        "10",
        "-f",
        "null",
        "-",
      ],
      stdin: "null",
      stdout: "null",
      stderr: "piped",
      signal: controller.signal,
    }).spawn();
    pipeStderr(child.stderr, `[encoder-probe ${encoder}]`);
    const status = await child.status;
    return status.success;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function detectVideoEncoder(): Promise<EncoderName | null> {
  if (cachedEncoder !== null) {
    return cachedEncoder;
  }
  if (detectingPromise) {
    return detectingPromise;
  }
  detectingPromise = (async () => {
    for (const enc of ["h264_v4l2m2m", "libx264"] as const) {
      if (await probeEncoder(enc)) {
        cachedEncoder = enc;
        return enc;
      }
    }
    return null;
  })();
  try {
    return await detectingPromise;
  } finally {
    detectingPromise = null;
  }
}

async function handleTranscode(
  req: Request,
  serviceId: string,
): Promise<Response> {
  const url = new URL(req.url);

  const audioTrackParam = url.searchParams.get("audioTrack");
  const audioTrackIndex =
    audioTrackParam !== null && Number.isInteger(Number(audioTrackParam))
      ? Math.max(0, Number(audioTrackParam))
      : 0;

  const qualityParam = url.searchParams.get("quality") ?? "720p";
  const quality: Quality = qualityParam in qualitySettings
    ? (qualityParam as Quality)
    : "720p";
  const { scale, bitrate } = qualitySettings[quality];

  const rawMode = url.searchParams.get("raw") === "1";

  const encoder = await detectVideoEncoder();
  if (encoder === null) {
    return new Response("No usable H.264 encoder found", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const vf = encoder === "h264_v4l2m2m"
    ? `yadif=mode=0:parity=-1:deint=1,scale=${scale},format=yuv420p`
    : `yadif=mode=0:parity=-1:deint=1,scale=${scale}`;

  const streamUrl = `${MIRAKC_API_URL}/services/${serviceId}/stream?decode=1`;
  const mirakcResponse = await fetch(streamUrl);

  if (!mirakcResponse.ok || !mirakcResponse.body) {
    return new Response("Failed to fetch stream from mirakc", {
      status: mirakcResponse.status,
    });
  }

  console.error(
    `[transcode] serviceId=${serviceId} encoder=${encoder} raw=${rawMode} quality=${quality} audioTrack=${audioTrackIndex}`,
  );

  const ffmpegChild = new Deno.Command("ffmpeg", {
    args: [
      "-fflags",
      "nobuffer",
      "-analyzeduration",
      "0",
      "-i",
      "pipe:0",
      "-map",
      "0:v:0",
      "-map",
      `0:a:${audioTrackIndex}?`,
      "-map",
      "0:d?",
      "-ignore_unknown",
      "-max_delay",
      "250000",
      "-vf",
      vf,
      ...buildVideoEncoderArgs(encoder, bitrate),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-c:d",
      "copy",
      "-f",
      "mpegts",
      "pipe:1",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  pipeStderr(ffmpegChild.stderr, "[ffmpeg]");

  let tsreadexChild: Deno.ChildProcess | null = null;
  if (!rawMode) {
    tsreadexChild = new Deno.Command("tsreadex", {
      args: [
        "-n",
        "-1",
        "-a",
        "13",
        "-b",
        "5",
        "-c",
        "5",
        "-u",
        "1",
        "-d",
        "13",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    pipeStderr(tsreadexChild.stderr, "[tsreadex]");
  }

  let cleanedUp = false;
  const cleanup = (reason: string) => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    console.error(
      `[transcode] cleanup serviceId=${serviceId} reason=${reason}`,
    );
    const term = (c: Deno.ChildProcess | null) => {
      if (!c) {
        return;
      }
      try {
        c.kill("SIGTERM");
      } catch {
        // already exited
      }
    };
    term(tsreadexChild);
    term(ffmpegChild);
    setTimeout(() => {
      const force = (c: Deno.ChildProcess | null) => {
        if (!c) {
          return;
        }
        try {
          c.kill("SIGKILL");
        } catch {
          // already exited
        }
      };
      force(tsreadexChild);
      force(ffmpegChild);
    }, 3000);
  };

  req.signal.addEventListener("abort", () => cleanup("client abort"), {
    once: true,
  });

  ffmpegChild.status
    .then((s) => cleanup(`ffmpeg exited code=${s.code}`))
    .catch(() => {});
  tsreadexChild?.status
    .then((s) => cleanup(`tsreadex exited code=${s.code}`))
    .catch(() => {});

  if (rawMode) {
    mirakcResponse.body.pipeTo(ffmpegChild.stdin).catch(() => {
      cleanup("mirakc -> ffmpeg pipe ended");
    });
  } else {
    mirakcResponse.body.pipeTo(tsreadexChild!.stdin).catch(() => {
      cleanup("mirakc -> tsreadex pipe ended");
    });
    tsreadexChild!.stdout.pipeTo(ffmpegChild.stdin).catch(() => {
      cleanup("tsreadex -> ffmpeg pipe ended");
    });
  }

  const responseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = ffmpegChild.stdout.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
        }
      } catch (e) {
        controller.error(e);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // already released
        }
      }
    },
    cancel() {
      cleanup("response body cancel");
    },
  });

  return new Response(responseBody, {
    status: 200,
    headers: {
      "Content-Type": "video/mp2t",
      "Cache-Control": "no-cache",
    },
  });
}

Deno.serve({ port: LISTEN_PORT }, (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/healthz") {
    return new Response("ok", { status: 200 });
  }

  const m = url.pathname.match(/^\/transcode\/services\/(\d+)$/);
  if (m) {
    return handleTranscode(req, m[1]);
  }

  return new Response("Not Found", { status: 404 });
});
