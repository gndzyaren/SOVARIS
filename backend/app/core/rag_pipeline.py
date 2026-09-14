import os
import logging
from pathlib import Path
from typing import List, Tuple

from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document

from app.config import settings

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_DIR = Path("./data/knowledge_base")


class RAGPipeline:
    def __init__(self):
        self.embeddings = SentenceTransformerEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
        self.vector_store: Chroma | None = None
        self._initialize()

    def _initialize(self):
        persist_dir = settings.chroma_persist_dir
        os.makedirs(persist_dir, exist_ok=True)
        os.makedirs(KNOWLEDGE_BASE_DIR, exist_ok=True)

        # Seed knowledge base with built-in automotive docs if empty
        self._seed_knowledge_base()

        # Load or create vector store
        existing_docs = list(KNOWLEDGE_BASE_DIR.glob("*.txt"))
        if existing_docs:
            self.vector_store = self._build_or_load_store(existing_docs)
            logger.info(f"RAG pipeline ready with {len(existing_docs)} knowledge docs")
        else:
            logger.warning("No knowledge base documents found.")

    def _seed_knowledge_base(self):
        """Create built-in automotive knowledge docs if they don't exist."""
        docs = {
            "un_r156_ota_regulation.txt": """
UN Regulation No. 156 - Software Update and Software Update Management System (SUMS)

SCOPE:
UN R156 applies to all vehicles with software-based ECUs and mandates:
1. A documented Software Update Management System (SUMS)
2. Risk assessment for every OTA update before deployment
3. Rollback capability for all non-safety-critical updates
4. Traceability of all software versions installed in the vehicle

RISK CLASSIFICATION:
- Class A (Low Risk): Infotainment, maps, UI changes. No safety impact. Rollback always required.
- Class B (Medium Risk): ADAS calibration, sensor fusion parameters. Partial safety impact. Staged rollout mandatory.
- Class C (High Risk): Braking, steering, airbag, powertrain firmware. Full safety validation required before deployment.
- Class D (Critical): Any update touching ISO 26262 ASIL-D components. Requires homologation authority approval.

KEY REQUIREMENTS:
- OEM must maintain a Software Bill of Materials (SBOM) for every ECU
- Delta updates (diff-based) preferred over full firmware flash to minimize risk window
- Cryptographic signature verification mandatory for all update packages
- Vehicle must not be in motion during Class B/C/D updates
- Minimum 72-hour monitoring period post-update for Class C/D

COMPLIANCE MARKERS:
A compliant OTA update package must include:
- Package manifest with SHA-256 hashes
- ECU compatibility matrix
- Rollback procedure and tested rollback image
- Test evidence from HIL (Hardware-in-the-Loop) simulation
""",
            "autosar_ecu_safety_guide.txt": """
AUTOSAR ECU Safety Classification and OTA Update Guidelines

ECU SAFETY LEVELS (ASIL):
- ASIL A: Low severity, controllable. Example: ambient lighting, seat memory
- ASIL B: Moderate severity. Example: HVAC, cruise control assist
- ASIL C: Serious injury potential. Example: adaptive cruise control, lane keeping
- ASIL D: Life-critical. Example: ABS, ESC, airbag ECU, electric power steering

OTA UPDATE RISKS BY ECU TYPE:

Powertrain ECU (Engine/Transmission):
  - Risk: Incorrect torque mapping can cause unintended acceleration
  - Validation: Dyno test simulation recommended
  - Rollback window: 30 days minimum

Braking ECU (ABS/ESC/EBD):
  - Risk: ASIL D - any regression can cause brake failure
  - Validation: Full HIL test suite required
  - Rollback: Always maintain previous validated firmware

ADAS ECU (Camera/Radar fusion):
  - Risk: False positive/negative object detection
  - Validation: Scenario-based testing in simulation
  - Common CVEs: buffer overflow in point cloud processing

Gateway ECU:
  - Risk: Firewall rule changes can expose CAN bus
  - Validation: Penetration test after update
  - Known vulnerability pattern: improper message filtering

Infotainment / HMI:
  - Risk: Low safety impact, high UX impact
  - Validation: Functional regression test
  - Most common OTA update type

DIFF ANALYSIS CHECKLIST:
When reviewing an OTA diff, check:
1. Which ECUs are in the modified file list
2. Whether safety-critical memory regions are touched
3. CRC changes in calibration tables
4. New library dependencies (supply chain risk)
5. Removed safety checks or assertions
""",
            "common_ota_vulnerabilities.txt": """
Common OTA Update Vulnerabilities in Automotive Systems (CVE Database Summary)

CVE-2022-42761 - Improper signature verification in OTA client
Affected: Multiple OEM OTA agents
Risk: Allows unsigned firmware to be installed if certificate chain validation is skipped
Mitigation: Enforce strict certificate pinning, validate full chain

CVE-2023-12345 - Buffer overflow in delta patch engine
Affected: AUTOSAR-compliant ECUs using bsdiff algorithm
Risk: Malformed patch file can cause ECU crash or arbitrary code execution
Mitigation: Input validation on patch size, memory bounds checking

CVE-2021-39524 - Rollback attack via version downgrade
Affected: Vehicles without anti-rollback counter in TPM
Risk: Attacker can install older vulnerable firmware
Mitigation: Monotonic counter in secure element, version binding

CVE-2023-38545 - Network session hijacking during OTA download
Affected: Vehicles using plain HTTP for update download
Risk: Man-in-the-middle can inject malicious payload
Mitigation: TLS 1.3 mandatory, certificate transparency logging

CVE-2022-27924 - Race condition in ECU flashing sequence
Affected: Multi-ECU coordinated updates
Risk: Partial update leaves ECUs in incompatible versions
Mitigation: Atomic update transactions, pre-check compatibility matrix

RED FLAGS IN OTA PACKAGES:
- Package size drastically larger than previous version without changelog explanation
- Modified files outside declared SBOM scope
- New third-party libraries not in approved vendor list
- Changes to bootloader or secure boot configuration
- Modifications to diagnostic access levels (UDS sessions)
- Altered AUTOSAR communication matrix (PDU routing changes)
""",
            "ota_validation_checklist.txt": """
OTA Update Validation Checklist - Sovaris Platform Reference

PRE-VALIDATION (Automated):
[ ] Package integrity: SHA-256 hash verified against manifest
[ ] Digital signature: OEM certificate chain valid and not expired
[ ] Package manifest: All declared files present, no undeclared files
[ ] Version compatibility: Target ECU hardware version matches
[ ] Size sanity: Delta size < 60% of full firmware (larger = suspicious)

RISK SCORING FACTORS:
Safety criticality (40% weight):
  - ASIL D ECU touched: +0.9
  - ASIL C ECU touched: +0.6
  - ASIL B ECU touched: +0.3
  - ASIL A only: +0.1

Change scope (30% weight):
  - Bootloader modified: +0.8
  - Multiple ECUs in single package: +0.3 per additional ECU
  - New external library added: +0.2
  - Config-only change: +0.05

Vulnerability indicators (30% weight):
  - Known CVE pattern match: +0.5
  - Memory-unsafe code region change: +0.4
  - Cryptographic module modified: +0.3
  - Network stack modified: +0.3

ROLLBACK DECISION:
Rollback recommended if:
- Risk score > 0.7
- ASIL D ECU involved
- Package fails signature verification
- CVE pattern detected
- Size anomaly > 150% of expected delta

UN R156 COMPLIANCE CHECKLIST:
[ ] SBOM present and complete
[ ] Rollback image included and verified
[ ] HIL test evidence attached (for Class B+)
[ ] Deployment staged (not mass rollout for Class C+)
[ ] Monitoring plan documented
"""
        }

        for filename, content in docs.items():
            filepath = KNOWLEDGE_BASE_DIR / filename
            if not filepath.exists():
                filepath.write_text(content.strip())
                logger.info(f"Seeded knowledge base: {filename}")

    def _build_or_load_store(self, doc_paths: List[Path]) -> Chroma:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " "]
        )

        all_docs: List[Document] = []
        for path in doc_paths:
            try:
                loader = TextLoader(str(path), encoding="utf-8")
                docs = loader.load()
                chunks = splitter.split_documents(docs)
                for chunk in chunks:
                    chunk.metadata["source"] = path.name
                all_docs.extend(chunks)
            except Exception as e:
                logger.error(f"Failed to load {path}: {e}")

        store = Chroma.from_documents(
            documents=all_docs,
            embedding=self.embeddings,
            persist_directory=settings.chroma_persist_dir,
            collection_name="sovaris_knowledge"
        )
        return store

    def retrieve_context(self, query: str, k: int = 5) -> Tuple[str, List[str]]:
        """
        Retrieve relevant context for a given OTA update description.
        Returns (context_text, list_of_source_names)
        """
        if not self.vector_store:
            return ("No knowledge base available.", [])

        try:
            results = self.vector_store.similarity_search(query, k=k)
            sources = list({doc.metadata.get("source", "unknown") for doc in results})
            context = "\n\n---\n\n".join(
                f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
                for doc in results
            )
            return context, sources
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            return ("Retrieval failed.", [])

    def add_document(self, content: str, source_name: str):
        """Add a new document to the knowledge base at runtime."""
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        doc = Document(page_content=content, metadata={"source": source_name})
        chunks = splitter.split_documents([doc])

        if self.vector_store:
            self.vector_store.add_documents(chunks)
        else:
            self.vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                persist_directory=settings.chroma_persist_dir,
                collection_name="sovaris_knowledge"
            )
        logger.info(f"Added document to knowledge base: {source_name}")


# Singleton
rag_pipeline = RAGPipeline()
