# docker-tv-recorder

Raspberry Pi で動かすオレオレ録画鯖の設定。

## 構成

| サービス | 役割 |
| --- | --- |
| `mirakc` | チューナ制御・録画・EPG。公式 image (`docker.io/mirakc/mirakc`) を使用 |
| `b25-server` | B-CAS による地デジ復号サイドカー (`docker.io/collelog/b25-server`) |
| `transcoder` | ライブ視聴用のトランスコードサイドカー。mirakc の生 TS を tsreadex + ffmpeg で H.264/AAC の MPEG-TS に再エンコードして配信する。詳細は [#1](https://github.com/ansanloms/docker-tv-recorder/issues/1) / [ansanloms/mirakc-ui#16](https://github.com/ansanloms/mirakc-ui/issues/16) 参照 |
| `ui` | mirakc-ui (`ghcr.io/ansanloms/mirakc-ui`)。番組表 / 録画予約 / ライブ視聴 UI |

## 起動

```sh
cp .env.example .env
# .env を編集 (RECORDING_DIR / UI_PORT)
docker compose up -d
```

## transcoder

ライブ視聴 (mirakc-ui の `/watch` ページ) で使用するトランスコード API を提供する独立コンテナ。

### API

- `GET /transcode/services/:id?quality=720p&audioTrack=0`
  - `id`: mirakc のサービス ID
  - `quality`: `480p` / `720p` / `1024p` (default: `720p`)
  - `audioTrack`: ARIB の audio ES index (default: `0`)
  - `raw=1`: tsreadex バイパス (デバッグ用)
- 出力: `Content-Type: video/mp2t` (字幕 PES 保持)

### env

- `MIRAKC_API_URL`: mirakc の base URL (default: `http://mirakc:40772/api` を compose で注入)
- `LISTEN_PORT`: HTTP listen port (default: `8001`)

### HW encoder (Pi 4 等)

`h264_v4l2m2m` は起動時に実エンコードテスト (probe) で自動検出する。Pi 4 で利用する場合は `compose.yaml` の `transcoder.devices` のコメントを外し、ホスト環境に合わせて `/dev/video*` を pass-through する。WSL2 や Pi 5 等で HW encoder が使えない環境では `libx264` に自動フォールバックする。
