FROM docker.io/lukechannings/deno:v1.39.1

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.2.1.tar.gz | tar -xz --strip-components 1
RUN deno cache main.ts

CMD ["run", "-A", "main.ts"]
