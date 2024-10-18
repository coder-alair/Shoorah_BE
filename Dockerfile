FROM node:18
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg
RUN echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
RUN apt-get update -qq && apt-get install --no-install-recommends -y google-chrome-stable libsqlite3-0

WORKDIR /app
COPY package.json /app
RUN npm install
COPY .  /app
CMD ["npm","start"]
EXPOSE 3003
