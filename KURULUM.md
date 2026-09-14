# SOVARIS — Kurulum ve Çalıştırma Rehberi

## Ön gereksinimler

- Python 3.11+
- Node.js 18+ ve npm
- Ollama (zaten kurulu)
- VSCode

---

## 1. Ollama'da model indir

```bash
ollama pull mistral
```

Çalıştığını doğrula:
```bash
ollama run mistral "Hello, respond in one sentence."
```

---

## 2. Backend kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Aktive et
# macOS / Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Bağımlılıkları kur
pip install -r requirements.txt

# .env dosyasını oluştur
cp .env.example .env
```

### .env düzenle
`.env` dosyasını aç ve OpenAI key'ini ekle:
```
OPENAI_API_KEY=sk-...gerçek-key-buraya...
```

OpenAI key'in yoksa boş bırakabilirsin — sistem Ollama'ya fallback eder.

### Backend'i başlat
```bash
# Backend klasöründen:
uvicorn app.main:app --reload --port 8000
```

Tarayıcıda aç: http://localhost:8000/docs

İlk başlatmada RAG pipeline knowledge base'i otomatik oluşturur.
`Starting SOVARIS backend...` mesajını gördüğünde hazır.

---

## 3. Frontend kurulumu

Yeni terminal aç:

```bash
cd frontend

# Node bağımlılıklarını kur
npm install

# Angular CLI global kur (ilk kez)
npm install -g @angular/cli

# Dev server başlat
ng serve
```

Tarayıcıda aç: http://localhost:4200

---

## 4. Test et

Validate sayfasına git → "High risk" quick test butonuna bas → Analyze.

Backend'de şunu göreceksin:
```
Routing to Ollama (complexity=0.65)     ← basit paketler
Routing to OpenAI (complexity=0.90)     ← kritik paketler
Validation complete: abc123 | risk=critical | LLM=openai
```

---

## Proje yapısı

```
sovaris/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          ← FastAPI endpoints
│   │   ├── core/
│   │   │   ├── rag_pipeline.py    ← ChromaDB + LangChain
│   │   │   └── llm_router.py      ← Ollama/OpenAI yönlendirme
│   │   ├── models/schemas.py      ← Pydantic modelleri
│   │   ├── services/
│   │   │   └── validation_service.py ← Ana iş mantığı
│   │   ├── config.py
│   │   └── main.py
│   ├── data/
│   │   ├── knowledge_base/        ← Buraya kendi PDF/TXT'lerini ekle
│   │   └── vector_store/          ← ChromaDB otomatik oluşturur
│   └── requirements.txt
└── frontend/
    └── src/app/
        ├── pages/
        │   ├── validate/           ← Upload sayfası
        │   ├── result/             ← Rapor sayfası
        │   ├── history/            ← Geçmiş
        │   └── dashboard/          ← İstatistikler
        └── services/api.service.ts ← HTTP çağrıları
```

---

## Knowledge base'e döküman ekle

`backend/data/knowledge_base/` klasörüne herhangi bir `.txt` dosyası at, backend'i yeniden başlat. RAG pipeline otomatik index'ler.

Örnek ekleme:
- Araç ECU spesifikasyon dökümanları
- Şirket OTA politika dökümanları
- Ek CVE raporları

---

## Yaygın hatalar

**"Ollama connection refused"**
```bash
ollama serve   # ayrı terminalde çalıştır
```

**"No module named langchain_chroma"**
```bash
pip install langchain-chroma==0.1.2
```

**Angular "Cannot find module '@angular/core'"**
```bash
rm -rf node_modules
npm install
```

**CORS hatası (tarayıcıda)**
Backend `app/main.py` içinde `allow_origins` listesine `http://localhost:4200` ekli — normal başlatmada sorun olmaz.

---

## Swagger UI

Backend çalışırken: http://localhost:8000/docs

Oradan direkt POST /api/v1/validate yapabilirsin, Angular'a gerek kalmadan.
