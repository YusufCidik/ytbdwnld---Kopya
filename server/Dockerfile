# 1. Güncel ve hafif bir Node.js imajı kullanıyoruz
FROM node:20-slim

# 2. Linux sistem bağımlılıklarını kuruyoruz (ffmpeg, python, curl, ca-certificates)
# yt-dlp çalışmak için Python'a ihtiyaç duyar.
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/bin/python3 /usr/bin/python

# 3. En güncel yt-dlp sürümünü indirip çalıştırılabilir yapıyoruz
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# 4. Çalışma dizinini belirliyoruz
WORKDIR /app

# 5. Bağımlılıkları kopyalayıp yüklüyoruz (Sadece üretim paketleri)
COPY package*.json ./
RUN npm install --production

# 6. Tüm server kodlarını kopyalıyoruz
COPY . .

# 7. PORT AYARI (Render için hayati önem taşır)
# Render genellikle 10000 portunu bekler, 5000'i kabul etmeyebilir.
ENV PORT=10000
EXPOSE 10000

# 8. Uygulamayı başlatıyoruz
# index.js dosyanın adının doğru olduğundan emin ol.
CMD ["node", "index.js"]