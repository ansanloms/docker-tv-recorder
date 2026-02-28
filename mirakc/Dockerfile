FROM docker.io/mirakc/mirakc:3.4.57-alpine

RUN <<EOF
apt-get update -yq

apt-get install -y ffmpeg

rm -rf /var/lib/apt/lists/*
apt-get clean
EOF
