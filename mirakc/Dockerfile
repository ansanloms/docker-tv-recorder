FROM docker.io/mirakc/mirakc:3.4.58-debian

RUN <<EOF
apt-get update -yq

apt-get install -y ffmpeg

rm -rf /var/lib/apt/lists/*
apt-get clean
EOF
