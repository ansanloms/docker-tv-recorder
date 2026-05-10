FROM docker.io/debian:bookworm-slim AS tsreadex-build

RUN <<EOF
    set -eux
    apt-get update
    apt-get install -y --no-install-recommends g++ cmake make curl ca-certificates
    rm -rf /var/lib/apt/lists/*
EOF

RUN <<EOF
    set -eux
    curl -fsSL https://github.com/xtne6f/tsreadex/archive/refs/tags/master-240517.tar.gz | tar -xz -C /tmp
    mv /tmp/tsreadex-master-240517 /tmp/tsreadex
    cmake -B /tmp/tsreadex/build -S /tmp/tsreadex -DCMAKE_BUILD_TYPE=Release
    cmake --build /tmp/tsreadex/build
EOF

FROM docker.io/denoland/deno:debian-2.7.14

RUN <<EOF
    set -eux
    apt-get update
    apt-get install -y --no-install-recommends ffmpeg
    rm -rf /var/lib/apt/lists/*
EOF

COPY --from=tsreadex-build /tmp/tsreadex/build/tsreadex /usr/local/bin/tsreadex
RUN chmod +x /usr/local/bin/tsreadex

WORKDIR /app
COPY deno.json main.ts ./
RUN deno cache main.ts

EXPOSE 8001

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-run", "main.ts"]
