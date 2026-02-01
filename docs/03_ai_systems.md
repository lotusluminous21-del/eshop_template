# AI Systems Specification

## Document Overview

This document specifies the AI-powered systems for the headless e-commerce template: the Catalogue Ingestion System for automated product data extraction, and the Buyer Assistant for conversational commerce. Both systems leverage Google's AI infrastructure (Gemini, ADK, Vector Search).

**Related Documents:**
- [01_system_architecture.md](./01_system_architecture.md) - System architecture overview
- [02_frontend_integration.md](./02_frontend_integration.md) - Frontend implementation details

---

## Part 1: AI Catalogue Ingestion System

### 1.1 System Overview

The Catalogue Ingestion System automates the extraction and transformation of product data from various formats into Shopify-compatible product records. It uses Google ADK agents with Gemini models for intelligent data extraction.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Catalogue Ingestion Pipeline                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INPUT SOURCES                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   CSV    │ │  Excel   │ │   JSON   │ │   PDF    │ │  Images  │     │
│  │ .csv     │ │ .xlsx    │ │ .json    │ │ catalog  │ │ products │     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │
│       │            │            │            │            │            │
│       └────────────┴────────────┴────────────┴────────────┘            │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Firebase Storage Upload                       │   │
│  │                    (triggers Cloud Function)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ADK Extraction Agent                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ File Parser │─▶│ Gemini Pro  │─▶│ Schema Mapper           │  │   │
│  │  │ (format    │  │ (extraction │  │ (Shopify product        │  │   │
│  │  │ detection) │  │ & enrichment│  │ schema validation)      │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Validation & Review Queue                     │   │
│  │  • Data completeness check                                       │   │
│  │  • Image URL validation                                          │   │
│  │  • Price/inventory sanity checks                                 │   │
│  │  • Duplicate detection                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Human Review Interface                        │   │
│  │  • Approve/reject products                                       │   │
│  │  • Edit extracted data                                           │   │
│  │  • Resolve flagged issues                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Shopify Admin API                             │   │
│  │  • Create/update products                                        │   │
│  │  • Upload images                                                 │   │
│  │  • Set inventory levels                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Supported Input Formats

| Format | Extensions | Extraction Method | Notes |
|--------|------------|-------------------|-------|
| **CSV** | `.csv` | Direct parsing + Gemini enrichment | Column mapping required |
| **Excel** | `.xlsx`, `.xls` | openpyxl + Gemini enrichment | Multi-sheet support |
| **JSON** | `.json` | Schema detection + mapping | Nested structure support |
| **PDF** | `.pdf` | Gemini Vision for layout analysis | Catalogue/brochure format |
| **Images** | `.jpg`, `.png`, `.webp` | Gemini Vision for product extraction | Single product per image |

### 1.3 Google ADK Agent Architecture

```python
# functions/agents/catalogue_agent.py
from google.adk import Agent, Tool
from google.adk.tools import FileSearchTool
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
import json

# Define the product schema for extraction
class ProductVariant(BaseModel):
    sku: str = Field(description="Stock keeping unit")
    title: str = Field(description="Variant title (e.g., 'Small / Red')")
    price: float = Field(description="Price in store currency")
    compare_at_price: Optional[float] = Field(default=None, description="Original price if on sale")
    inventory_quantity: int = Field(default=0, description="Available stock")
    weight: Optional[float] = Field(default=None, description="Weight in grams")
    option1: Optional[str] = Field(default=None, description="First option value (e.g., size)")
    option2: Optional[str] = Field(default=None, description="Second option value (e.g., color)")
    option3: Optional[str] = Field(default=None, description="Third option value")
    image_url: Optional[str] = Field(default=None, description="Variant-specific image URL")

class ExtractedProduct(BaseModel):
    title: str = Field(description="Product title")
    description: str = Field(description="Product description (can be HTML)")
    vendor: Optional[str] = Field(default=None, description="Brand or manufacturer")
    product_type: Optional[str] = Field(default=None, description="Product category")
    tags: List[str] = Field(default_factory=list, description="Product tags for search/filtering")
    variants: List[ProductVariant] = Field(description="Product variants")
    images: List[str] = Field(default_factory=list, description="Product image URLs")
    metafields: dict = Field(default_factory=dict, description="Custom metafields")
    
    # Extraction metadata
    confidence_score: float = Field(description="Extraction confidence 0-1")
    issues: List[str] = Field(default_factory=list, description="Flagged issues for review")
    source_reference: str = Field(description="Reference to source data (row number, page, etc.)")

class ExtractionResult(BaseModel):
    products: List[ExtractedProduct]
    total_extracted: int
    total_issues: int
    processing_notes: List[str]


# Define extraction tools
class ParseCSVTool(Tool):
    """Parse CSV file and return structured data."""
    
    name = "parse_csv"
    description = "Parse a CSV file and return rows as structured data"
    
    def run(self, file_path: str, encoding: str = "utf-8") -> dict:
        import pandas as pd
        
        df = pd.read_csv(file_path, encoding=encoding)
        return {
            "columns": df.columns.tolist(),
            "row_count": len(df),
            "sample_rows": df.head(5).to_dict(orient="records"),
            "data": df.to_dict(orient="records")
        }


class ParseExcelTool(Tool):
    """Parse Excel file with multiple sheets."""
    
    name = "parse_excel"
    description = "Parse an Excel file and return data from all sheets"
    
    def run(self, file_path: str) -> dict:
        import pandas as pd
        
        xlsx = pd.ExcelFile(file_path)
        sheets = {}
        
        for sheet_name in xlsx.sheet_names:
            df = pd.read_excel(xlsx, sheet_name=sheet_name)
            sheets[sheet_name] = {
                "columns": df.columns.tolist(),
                "row_count": len(df),
                "data": df.to_dict(orient="records")
            }
        
        return {"sheets": sheets, "sheet_names": xlsx.sheet_names}


class ExtractFromImageTool(Tool):
    """Extract product information from an image using Gemini Vision."""
    
    name = "extract_from_image"
    description = "Extract product details from a product image"
    
    def __init__(self, genai_client):
        self.client = genai_client
    
    def run(self, image_path: str) -> dict:
        from google.genai import types
        
        # Load image
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        response = self.client.models.generate_content(
            model="gemini-1.5-pro",
            contents=[
                types.Part.from_bytes(image_data, mime_type="image/jpeg"),
                types.Part.from_text("""
                    Analyze this product image and extract:
                    1. Product name/title
                    2. Visible features and specifications
                    3. Any text visible (brand, model, etc.)
                    4. Color and material if discernible
                    5. Estimated product category
                    
                    Return as JSON with keys: title, features, visible_text, color, material, category
                """)
            ]
        )
        
        return json.loads(response.text)


class ExtractFromPDFTool(Tool):
    """Extract product catalogue from PDF using Gemini Vision."""
    
    name = "extract_from_pdf"
    description = "Extract products from a PDF catalogue"
    
    def __init__(self, genai_client):
        self.client = genai_client
    
    def run(self, pdf_path: str, page_range: tuple = None) -> dict:
        import fitz  # PyMuPDF
        from google.genai import types
        
        doc = fitz.open(pdf_path)
        products = []
        
        pages = range(doc.page_count) if not page_range else range(*page_range)
        
        for page_num in pages:
            page = doc[page_num]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
            image_data = pix.tobytes("png")
            
            response = self.client.models.generate_content(
                model="gemini-1.5-pro",
                contents=[
                    types.Part.from_bytes(image_data, mime_type="image/png"),
                    types.Part.from_text("""
                        This is page {page_num} of a product catalogue.
                        Extract ALL products visible on this page.
                        
                        For each product, extract:
                        - title: Product name
                        - description: Any description text
                        - price: Price if visible (include currency)
                        - sku: SKU/product code if visible
                        - specifications: Any specs or features listed
                        
                        Return as JSON array of products.
                        If no products are visible, return empty array.
                    """.format(page_num=page_num + 1))
                ]
            )
            
            page_products = json.loads(response.text)
            for p in page_products:
                p["source_page"] = page_num + 1
            products.extend(page_products)
        
        return {"products": products, "total_pages": doc.page_count}


# Main Catalogue Agent
class CatalogueIngestionAgent(Agent):
    """Agent for extracting and transforming product catalogues."""
    
    name = "catalogue_ingestion_agent"
    description = "Extracts product data from various file formats and maps to Shopify schema"
    
    model = "gemini-1.5-pro"
    
    system_instruction = """
    You are a product catalogue extraction specialist. Your job is to:
    
    1. Analyze uploaded files (CSV, Excel, JSON, PDF, images)
    2. Extract product information accurately
    3. Map extracted data to the Shopify product schema
    4. Flag any issues or missing required fields
    5. Enrich product descriptions when appropriate
    
    Guidelines:
    - Always preserve original pricing and SKU data exactly
    - Generate SEO-friendly descriptions if originals are poor
    - Detect and flag potential duplicates
    - Validate image URLs are accessible
    - Convert measurements to consistent units (grams for weight)
    - Extract variant information (size, color, etc.) from titles if needed
    
    Required fields that must be present or flagged:
    - title (required)
    - at least one variant with price (required)
    - description (recommended)
    - images (recommended)
    """
    
    tools = [
        ParseCSVTool(),
        ParseExcelTool(),
        ExtractFromImageTool(genai.Client()),
        ExtractFromPDFTool(genai.Client()),
    ]
    
    def process_file(self, file_path: str, file_type: str, mapping_config: dict = None) -> ExtractionResult:
        """
        Process a file and extract products.
        
        Args:
            file_path: Path to the uploaded file
            file_type: Type of file (csv, excel, json, pdf, image)
            mapping_config: Optional column/field mapping configuration
        
        Returns:
            ExtractionResult with extracted products
        """
        # This method orchestrates the extraction based on file type
        # The actual implementation uses the agent's chat interface
        pass
```

### 1.4 Data Extraction Pipeline

```python
# functions/services/catalogue_service.py
from firebase_admin import firestore, storage
from google.cloud import tasks_v2
from datetime import datetime, timedelta
import json
from typing import Optional
from agents.catalogue_agent import CatalogueIngestionAgent, ExtractionResult

class CatalogueService:
    """Service for managing catalogue ingestion jobs."""
    
    def __init__(self):
        self.db = firestore.client()
        self.storage = storage.bucket()
        self.agent = CatalogueIngestionAgent()
    
    async def create_job(
        self,
        client_id: str,
        file_url: str,
        file_name: str,
        file_type: str,
        mapping_config: Optional[dict] = None,
        created_by: str = None
    ) -> str:
        """Create a new catalogue ingestion job."""
        
        job_ref = self.db.collection(f"clients/{client_id}/ai_jobs").document()
        
        job_data = {
            "id": job_ref.id,
            "type": "catalogue_ingestion",
            "status": "pending",
            "fileUrl": file_url,
            "fileName": file_name,
            "fileType": file_type,
            "mappingConfig": mapping_config or {},
            "createdBy": created_by,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "progress": 0,
            "productsExtracted": 0,
            "issuesFound": 0,
            "errorMessage": None,
        }
        
        job_ref.set(job_data)
        
        # Queue the processing task
        await self._queue_processing_task(client_id, job_ref.id)
        
        return job_ref.id
    
    async def process_job(self, client_id: str, job_id: str):
        """Process a catalogue ingestion job."""
        
        job_ref = self.db.collection(f"clients/{client_id}/ai_jobs").document(job_id)
        job = job_ref.get().to_dict()
        
        try:
            # Update status to processing
            job_ref.update({
                "status": "processing",
                "updatedAt": datetime.utcnow(),
                "startedAt": datetime.utcnow(),
            })
            
            # Download file from storage
            local_path = await self._download_file(job["fileUrl"])
            
            # Process with agent
            result = await self._extract_products(
                local_path,
                job["fileType"],
                job["mappingConfig"],
                lambda progress: job_ref.update({"progress": progress, "updatedAt": datetime.utcnow()})
            )
            
            # Store extracted products
            products_ref = self.db.collection(f"clients/{client_id}/ai_jobs/{job_id}/products")
            
            for product in result.products:
                products_ref.add(product.dict())
            
            # Update job status
            has_issues = result.total_issues > 0
            job_ref.update({
                "status": "review_required" if has_issues else "ready_to_publish",
                "progress": 100,
                "productsExtracted": result.total_extracted,
                "issuesFound": result.total_issues,
                "processingNotes": result.processing_notes,
                "completedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            })
            
        except Exception as e:
            job_ref.update({
                "status": "failed",
                "errorMessage": str(e),
                "updatedAt": datetime.utcnow(),
            })
            raise
    
    async def _extract_products(
        self,
        file_path: str,
        file_type: str,
        mapping_config: dict,
        progress_callback
    ) -> ExtractionResult:
        """Extract products using the ADK agent."""
        
        # Determine extraction strategy based on file type
        if file_type == "csv":
            return await self._extract_from_csv(file_path, mapping_config, progress_callback)
        elif file_type == "excel":
            return await self._extract_from_excel(file_path, mapping_config, progress_callback)
        elif file_type == "json":
            return await self._extract_from_json(file_path, mapping_config, progress_callback)
        elif file_type == "pdf":
            return await self._extract_from_pdf(file_path, progress_callback)
        elif file_type == "image":
            return await self._extract_from_image(file_path, progress_callback)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    async def _extract_from_csv(
        self,
        file_path: str,
        mapping_config: dict,
        progress_callback
    ) -> ExtractionResult:
        """Extract products from CSV with Gemini enrichment."""
        
        import pandas as pd
        from google import genai
        
        df = pd.read_csv(file_path)
        total_rows = len(df)
        products = []
        issues_count = 0
        
        # If no mapping config, use Gemini to infer column mapping
        if not mapping_config:
            mapping_config = await self._infer_column_mapping(df.columns.tolist())
        
        client = genai.Client()
        
        for idx, row in df.iterrows():
            progress_callback(int((idx / total_rows) * 100))
            
            # Map row to product structure
            product_data = self._map_row_to_product(row, mapping_config)
            
            # Enrich with Gemini if description is poor
            if len(product_data.get("description", "")) < 50:
                enriched = await self._enrich_product_description(client, product_data)
                product_data["description"] = enriched["description"]
                product_data["tags"] = enriched.get("tags", [])
            
            # Validate and flag issues
            issues = self._validate_product(product_data)
            if issues:
                issues_count += 1
                product_data["issues"] = issues
            
            product_data["confidence_score"] = 0.9 if not issues else 0.6
            product_data["source_reference"] = f"Row {idx + 2}"  # +2 for header and 0-index
            
            products.append(ExtractedProduct(**product_data))
        
        return ExtractionResult(
            products=products,
            total_extracted=len(products),
            total_issues=issues_count,
            processing_notes=[f"Processed {total_rows} rows from CSV"]
        )
    
    async def _infer_column_mapping(self, columns: list) -> dict:
        """Use Gemini to infer column mapping from column names."""
        
        from google import genai
        
        client = genai.Client()
        
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=f"""
            Given these CSV column names: {columns}
            
            Map them to Shopify product fields. Return JSON with this structure:
            {{
                "title": "column_name or null",
                "description": "column_name or null",
                "price": "column_name or null",
                "compare_at_price": "column_name or null",
                "sku": "column_name or null",
                "vendor": "column_name or null",
                "product_type": "column_name or null",
                "tags": "column_name or null",
                "inventory_quantity": "column_name or null",
                "weight": "column_name or null",
                "image_url": "column_name or null",
                "option1_name": "column_name or null",
                "option1_value": "column_name or null",
                "option2_name": "column_name or null",
                "option2_value": "column_name or null"
            }}
            
            Only map columns that clearly correspond to the field.
            Return only the JSON, no explanation.
            """
        )
        
        return json.loads(response.text)
    
    async def _enrich_product_description(self, client, product_data: dict) -> dict:
        """Enrich product description using Gemini."""
        
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=f"""
            Create an engaging e-commerce product description for:
            
            Title: {product_data.get('title', 'Unknown Product')}
            Current description: {product_data.get('description', 'No description')}
            Category: {product_data.get('product_type', 'General')}
            Vendor: {product_data.get('vendor', 'Unknown')}
            
            Requirements:
            1. Write 2-3 paragraphs (100-200 words total)
            2. Highlight key features and benefits
            3. Use persuasive but honest language
            4. Include relevant keywords for SEO
            5. Suggest 5-10 relevant tags
            
            Return JSON:
            {{
                "description": "HTML formatted description",
                "tags": ["tag1", "tag2", ...]
            }}
            """
        )
        
        return json.loads(response.text)
    
    def _validate_product(self, product_data: dict) -> list:
        """Validate product data and return list of issues."""
        
        issues = []
        
        # Required field checks
        if not product_data.get("title"):
            issues.append("Missing product title")
        
        if not product_data.get("variants") or not any(v.get("price") for v in product_data.get("variants", [])):
            issues.append("Missing price information")
        
        # Data quality checks
        if product_data.get("title") and len(product_data["title"]) < 3:
            issues.append("Title too short")
        
        if product_data.get("description") and len(product_data["description"]) < 20:
            issues.append("Description too short - consider enrichment")
        
        # Price sanity checks
        for variant in product_data.get("variants", []):
            price = variant.get("price", 0)
            if price <= 0:
                issues.append(f"Invalid price for variant: {variant.get('sku', 'unknown')}")
            if price > 100000:
                issues.append(f"Unusually high price ({price}) - please verify")
        
        # Image validation
        if not product_data.get("images"):
            issues.append("No product images")
        
        return issues
    
    async def publish_products(self, client_id: str, job_id: str, product_ids: list = None):
        """Publish approved products to Shopify."""
        
        from services.shopify_admin import ShopifyAdminService
        
        shopify = ShopifyAdminService(client_id)
        job_ref = self.db.collection(f"clients/{client_id}/ai_jobs").document(job_id)
        products_ref = self.db.collection(f"clients/{client_id}/ai_jobs/{job_id}/products")
        
        # Get products to publish
        if product_ids:
            products = [products_ref.document(pid).get().to_dict() for pid in product_ids]
        else:
            products = [doc.to_dict() for doc in products_ref.stream()]
        
        published_count = 0
        failed_count = 0
        
        for product in products:
            try:
                # Transform to Shopify format
                shopify_product = self._transform_to_shopify_format(product)
                
                # Create in Shopify
                result = await shopify.create_product(shopify_product)
                
                # Update product record with Shopify ID
                products_ref.document(product["id"]).update({
                    "shopifyProductId": result["id"],
                    "publishedAt": datetime.utcnow(),
                    "status": "published"
                })
                
                published_count += 1
                
            except Exception as e:
                products_ref.document(product["id"]).update({
                    "publishError": str(e),
                    "status": "publish_failed"
                })
                failed_count += 1
        
        # Update job status
        job_ref.update({
            "status": "completed" if failed_count == 0 else "partially_completed",
            "publishedCount": published_count,
            "publishFailedCount": failed_count,
            "updatedAt": datetime.utcnow(),
        })
        
        return {"published": published_count, "failed": failed_count}
    
    def _transform_to_shopify_format(self, product: dict) -> dict:
        """Transform extracted product to Shopify Admin API format."""
        
        return {
            "title": product["title"],
            "body_html": product.get("description", ""),
            "vendor": product.get("vendor"),
            "product_type": product.get("product_type"),
            "tags": ",".join(product.get("tags", [])),
            "variants": [
                {
                    "sku": v.get("sku"),
                    "price": str(v.get("price", 0)),
                    "compare_at_price": str(v["compare_at_price"]) if v.get("compare_at_price") else None,
                    "inventory_quantity": v.get("inventory_quantity", 0),
                    "weight": v.get("weight"),
                    "weight_unit": "g",
                    "option1": v.get("option1"),
                    "option2": v.get("option2"),
                    "option3": v.get("option3"),
                }
                for v in product.get("variants", [])
            ],
            "images": [{"src": url} for url in product.get("images", [])],
            "metafields": [
                {"namespace": "custom", "key": k, "value": v, "type": "single_line_text_field"}
                for k, v in product.get("metafields", {}).items()
            ]
        }
```

### 1.5 Firebase Functions Implementation

```python
# functions/main.py
from firebase_functions import https_fn, storage_fn, options
from firebase_admin import initialize_app, firestore
from services.catalogue_service import CatalogueService

initialize_app()

@storage_fn.on_object_finalized(
    bucket="{PROJECT_ID}.appspot.com",
    region="europe-west1"
)
def on_catalogue_upload(event: storage_fn.CloudEvent):
    """Triggered when a file is uploaded to the catalogue folder."""
    
    file_path = event.data["name"]
    
    # Only process files in the catalogue-uploads folder
    if not file_path.startswith("catalogue-uploads/"):
        return
    
    # Extract client ID and file info from path
    # Expected format: catalogue-uploads/{client_id}/{job_id}/{filename}
    parts = file_path.split("/")
    if len(parts) < 4:
        return
    
    client_id = parts[1]
    job_id = parts[2]
    file_name = parts[3]
    
    # Determine file type
    file_type = _get_file_type(file_name)
    if not file_type:
        return
    
    # Update job with file info and trigger processing
    db = firestore.client()
    job_ref = db.collection(f"clients/{client_id}/ai_jobs").document(job_id)
    
    job_ref.update({
        "fileUrl": f"gs://{event.data['bucket']}/{file_path}",
        "fileName": file_name,
        "fileType": file_type,
        "status": "queued",
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })


@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.GB_1,
    timeout_sec=540,  # 9 minutes for large catalogues
)
def start_catalogue_ingestion(req: https_fn.CallableRequest) -> dict:
    """Start a catalogue ingestion job."""
    
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required"
        )
    
    # Verify admin role
    from firebase_admin import auth
    user = auth.get_user(req.auth.uid)
    if user.custom_claims.get("role") not in ["admin", "super_admin"]:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Admin access required"
        )
    
    client_id = user.custom_claims.get("clientId")
    
    service = CatalogueService()
    job_id = service.create_job(
        client_id=client_id,
        file_url=req.data.get("fileUrl"),
        file_name=req.data.get("fileName"),
        file_type=req.data.get("fileType"),
        mapping_config=req.data.get("mappingConfig"),
        created_by=req.auth.uid
    )
    
    return {"jobId": job_id, "status": "pending"}


@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.GB_2,
    timeout_sec=540,
)
def process_catalogue_job(req: https_fn.CallableRequest) -> dict:
    """Process a queued catalogue job (called by Cloud Tasks)."""
    
    client_id = req.data.get("clientId")
    job_id = req.data.get("jobId")
    
    service = CatalogueService()
    service.process_job(client_id, job_id)
    
    return {"success": True}


@https_fn.on_call(region="europe-west1")
def get_catalogue_job_status(req: https_fn.CallableRequest) -> dict:
    """Get the status of a catalogue ingestion job."""
    
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required"
        )
    
    from firebase_admin import auth
    user = auth.get_user(req.auth.uid)
    client_id = user.custom_claims.get("clientId")
    job_id = req.data.get("jobId")
    
    db = firestore.client()
    job = db.collection(f"clients/{client_id}/ai_jobs").document(job_id).get()
    
    if not job.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Job not found"
        )
    
    return job.to_dict()


@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.GB_1,
    timeout_sec=300,
)
def publish_catalogue_products(req: https_fn.CallableRequest) -> dict:
    """Publish approved products to Shopify."""
    
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required"
        )
    
    from firebase_admin import auth
    user = auth.get_user(req.auth.uid)
    if user.custom_claims.get("role") not in ["admin", "super_admin"]:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Admin access required"
        )
    
    client_id = user.custom_claims.get("clientId")
    job_id = req.data.get("jobId")
    product_ids = req.data.get("productIds")  # Optional: specific products to publish
    
    service = CatalogueService()
    result = service.publish_products(client_id, job_id, product_ids)
    
    return result


def _get_file_type(filename: str) -> str:
    """Determine file type from filename."""
    
    ext = filename.lower().split(".")[-1]
    
    type_map = {
        "csv": "csv",
        "xlsx": "excel",
        "xls": "excel",
        "json": "json",
        "pdf": "pdf",
        "jpg": "image",
        "jpeg": "image",
        "png": "image",
        "webp": "image",
    }
    
    return type_map.get(ext)
```

### 1.6 Job Queue Management

```python
# functions/services/job_queue.py
from firebase_admin import firestore
from google.cloud import tasks_v2
from datetime import datetime, timedelta
import json

class JobQueueService:
    """Manages the catalogue ingestion job queue."""
    
    def __init__(self, project_id: str, location: str = "europe-west1"):
        self.project_id = project_id
        self.location = location
        self.queue_name = "catalogue-ingestion"
        self.tasks_client = tasks_v2.CloudTasksClient()
        self.db = firestore.client()
    
    @property
    def queue_path(self) -> str:
        return self.tasks_client.queue_path(
            self.project_id, self.location, self.queue_name
        )
    
    async def enqueue_job(self, client_id: str, job_id: str, delay_seconds: int = 0):
        """Add a job to the processing queue."""
        
        task = tasks_v2.Task(
            http_request=tasks_v2.HttpRequest(
                http_method=tasks_v2.HttpMethod.POST,
                url=f"https://{self.location}-{self.project_id}.cloudfunctions.net/process_catalogue_job",
                headers={"Content-Type": "application/json"},
                body=json.dumps({
                    "data": {
                        "clientId": client_id,
                        "jobId": job_id
                    }
                }).encode(),
            )
        )
        
        if delay_seconds > 0:
            task.schedule_time = datetime.utcnow() + timedelta(seconds=delay_seconds)
        
        self.tasks_client.create_task(parent=self.queue_path, task=task)
    
    async def get_queue_status(self, client_id: str) -> dict:
        """Get status of all jobs for a client."""
        
        jobs = self.db.collection(f"clients/{client_id}/ai_jobs") \
            .order_by("createdAt", direction=firestore.Query.DESCENDING) \
            .limit(50) \
            .stream()
        
        status_counts = {
            "pending": 0,
            "processing": 0,
            "review_required": 0,
            "ready_to_publish": 0,
            "completed": 0,
            "failed": 0,
        }
        
        job_list = []
        for job in jobs:
            data = job.to_dict()
            status_counts[data["status"]] = status_counts.get(data["status"], 0) + 1
            job_list.append({
                "id": job.id,
                "fileName": data["fileName"],
                "status": data["status"],
                "progress": data.get("progress", 0),
                "productsExtracted": data.get("productsExtracted", 0),
                "createdAt": data["createdAt"].isoformat() if data.get("createdAt") else None,
            })
        
        return {
            "jobs": job_list,
            "statusCounts": status_counts,
        }
    
    async def retry_failed_job(self, client_id: str, job_id: str):
        """Retry a failed job."""
        
        job_ref = self.db.collection(f"clients/{client_id}/ai_jobs").document(job_id)
        job = job_ref.get()
        
        if not job.exists:
            raise ValueError("Job not found")
        
        if job.to_dict()["status"] != "failed":
            raise ValueError("Can only retry failed jobs")
        
        # Reset job status
        job_ref.update({
            "status": "pending",
            "errorMessage": None,
            "progress": 0,
            "retryCount": firestore.Increment(1),
            "updatedAt": datetime.utcnow(),
        })
        
        # Re-queue
        await self.enqueue_job(client_id, job_id)
```

---

## Part 2: AI Buyer Assistant

### 2.1 RAG Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI Buyer Assistant Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USER INPUT                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  "I'm looking for a red dress for a summer wedding"             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Intent Classification                         │   │
│  │  • Product search                                                │   │
│  │  • Product question                                              │   │
│  │  • Order inquiry                                                 │   │
│  │  • General help                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RAG Pipeline                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ Query       │─▶│ Vector      │─▶│ Context                 │  │   │
│  │  │ Embedding   │  │ Search      │  │ Assembly                │  │   │
│  │  │ (Gemini)    │  │ (FileSearch)│  │ (top-k products)        │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Response Generation                           │   │
│  │  • Gemini Pro with product context                               │   │
│  │  • Persona-aware responses                                       │   │
│  │  • Product recommendations with links                            │   │
│  │  • Follow-up suggestions                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Streaming Response                            │   │
│  │  "I found some beautiful options for you! Here are my top       │   │
│  │   picks for a summer wedding:                                    │   │
│  │   1. [Elegant Red Maxi Dress] - Perfect for outdoor ceremonies  │   │
│  │   2. [Floral Red Wrap Dress] - Light and comfortable..."        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Catalogue Indexing

```python
# functions/services/product_indexer.py
from google import genai
from google.adk.tools import FileSearchTool
from firebase_admin import firestore
from typing import List, Dict
import json

class ProductIndexer:
    """Indexes product catalogue for RAG-based search."""
    
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.db = firestore.client()
        self.genai_client = genai.Client()
        self.corpus_name = f"product-catalogue-{client_id}"
    
    async def create_or_update_index(self):
        """Create or update the product index from Shopify data."""
        
        # Fetch all products from Firestore cache or Shopify
        products = await self._fetch_all_products()
        
        # Create corpus if it doesn't exist
        corpus = await self._get_or_create_corpus()
        
        # Prepare documents for indexing
        documents = []
        for product in products:
            doc_content = self._format_product_for_indexing(product)
            documents.append({
                "display_name": product["title"],
                "content": doc_content,
                "metadata": {
                    "product_id": product["id"],
                    "handle": product["handle"],
                    "product_type": product.get("productType", ""),
                    "vendor": product.get("vendor", ""),
                    "price_min": product.get("priceRange", {}).get("minVariantPrice", {}).get("amount", "0"),
                    "available": str(product.get("availableForSale", True)),
                }
            })
        
        # Batch upload documents
        await self._upload_documents(corpus, documents)
        
        # Update index metadata
        self.db.collection(f"clients/{self.client_id}/settings").document("ai_index").set({
            "lastUpdated": firestore.SERVER_TIMESTAMP,
            "productCount": len(documents),
            "corpusName": self.corpus_name,
        })
        
        return {"indexed": len(documents)}
    
    def _format_product_for_indexing(self, product: dict) -> str:
        """Format product data for optimal RAG retrieval."""
        
        # Extract variant information
        variants_text = ""
        if product.get("variants"):
            variants = product["variants"].get("edges", [])
            variant_details = []
            for v in variants[:10]:  # Limit to 10 variants
                node = v.get("node", {})
                options = " / ".join([
                    f"{opt['name']}: {opt['value']}" 
                    for opt in node.get("selectedOptions", [])
                ])
                price = node.get("price", {}).get("amount", "N/A")
                available = "in stock" if node.get("availableForSale") else "out of stock"
                variant_details.append(f"- {options} - €{price} ({available})")
            variants_text = "\n".join(variant_details)
        
        # Extract tags
        tags = ", ".join(product.get("tags", []))
        
        # Build searchable document
        return f"""
PRODUCT: {product['title']}

DESCRIPTION:
{product.get('description', 'No description available')}

CATEGORY: {product.get('productType', 'Uncategorized')}
BRAND: {product.get('vendor', 'Unknown')}
TAGS: {tags}

PRICE RANGE: €{product.get('priceRange', {}).get('minVariantPrice', {}).get('amount', 'N/A')} - €{product.get('priceRange', {}).get('maxVariantPrice', {}).get('amount', 'N/A')}

VARIANTS:
{variants_text}

PRODUCT URL: /products/{product['handle']}
        """.strip()
    
    async def _get_or_create_corpus(self):
        """Get existing corpus or create new one."""
        
        try:
            corpus = self.genai_client.corpora.get(name=self.corpus_name)
        except Exception:
            corpus = self.genai_client.corpora.create(
                display_name=f"Product Catalogue - {self.client_id}",
                name=self.corpus_name
            )
        
        return corpus
    
    async def _upload_documents(self, corpus, documents: List[Dict]):
        """Upload documents to the corpus."""
        
        # Delete existing documents first (full reindex)
        existing_docs = list(self.genai_client.corpora.documents.list(parent=corpus.name))
        for doc in existing_docs:
            self.genai_client.corpora.documents.delete(name=doc.name)
        
        # Upload new documents in batches
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            for doc in batch:
                self.genai_client.corpora.documents.create(
                    parent=corpus.name,
                    document={
                        "display_name": doc["display_name"],
                        "content": {"parts": [{"text": doc["content"]}]},
                        "custom_metadata": doc["metadata"]
                    }
                )
    
    async def _fetch_all_products(self) -> List[Dict]:
        """Fetch all products from Shopify via Storefront API."""
        
        from lib.shopify.queries import get_all_products_for_indexing
        return await get_all_products_for_indexing()
```

### 2.3 Buyer Assistant Agent

```python
# functions/agents/buyer_assistant.py
from google.adk import Agent
from google.adk.tools import FileSearchTool
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
from firebase_admin import firestore
import json

class ProductRecommendation(BaseModel):
    product_id: str
    title: str
    handle: str
    reason: str
    price: str
    image_url: Optional[str] = None

class AssistantResponse(BaseModel):
    message: str
    recommendations: List[ProductRecommendation] = []
    follow_up_questions: List[str] = []
    intent: str  # search, question, order, help, greeting, farewell

class BuyerAssistantAgent(Agent):
    """AI-powered shopping assistant for e-commerce."""
    
    name = "buyer_assistant"
    description = "Helps customers find products, answer questions, and make purchase decisions"
    model = "gemini-1.5-pro"
    
    def __init__(self, client_id: str, config: dict = None):
        self.client_id = client_id
        self.config = config or {}
        self.db = firestore.client()
        
        # Load client-specific configuration
        self._load_client_config()
        
        # Initialize FileSearchTool with product corpus
        self.file_search = FileSearchTool(
            corpus_name=f"product-catalogue-{client_id}"
        )
        
        super().__init__()
    
    def _load_client_config(self):
        """Load client-specific assistant configuration."""
        
        config_doc = self.db.collection(f"clients/{self.client_id}/settings") \
            .document("ai_assistant").get()
        
        if config_doc.exists:
            client_config = config_doc.to_dict()
            self.persona = client_config.get("persona", "friendly shopping assistant")
            self.language = client_config.get("language", "en")
            self.store_name = client_config.get("storeName", "our store")
            self.domain_knowledge = client_config.get("domainKnowledge", "")
            self.tone = client_config.get("tone", "helpful and professional")
        else:
            self.persona = "friendly shopping assistant"
            self.language = "en"
            self.store_name = "our store"
            self.domain_knowledge = ""
            self.tone = "helpful and professional"
    
    @property
    def system_instruction(self) -> str:
        return f"""
You are a {self.persona} for {self.store_name}.

PERSONALITY & TONE:
- Be {self.tone}
- Respond in {self.language}
- Show genuine interest in helping customers find what they need
- Be knowledgeable but not pushy

DOMAIN KNOWLEDGE:
{self.domain_knowledge}

CAPABILITIES:
1. Product Search: Help customers find products based on their needs
2. Product Questions: Answer questions about specific products
3. Recommendations: Suggest products based on preferences and context
4. Comparisons: Help compare similar products
5. Availability: Check if products are in stock
6. General Help: Answer questions about shipping, returns, etc.

RESPONSE GUIDELINES:
1. Always search the product catalogue before making recommendations
2. Include specific product names and prices when recommending
3. Provide product links in format: [Product Name](/products/handle)
4. Suggest 2-4 relevant products, not more
5. Ask clarifying questions if the request is vague
6. If no matching products found, suggest alternatives or ask for more details

CONVERSATION FLOW:
- Greeting → Understand need → Search/Recommend → Answer questions → Guide to purchase
- Always end with a helpful follow-up question or call to action

DO NOT:
- Make up products that don't exist in the catalogue
- Provide incorrect prices or availability
- Be overly salesy or pushy
- Discuss competitors
- Make promises about delivery times without checking
"""
    
    tools = [FileSearchTool]
    
    async def process_message(
        self,
        message: str,
        conversation_history: List[dict] = None,
        user_context: dict = None
    ) -> AssistantResponse:
        """
        Process a user message and generate a response.
        
        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            user_context: Additional context (cart contents, viewed products, etc.)
        
        Returns:
            AssistantResponse with message, recommendations, and follow-ups
        """
        
        # Build context from history
        context = self._build_context(conversation_history, user_context)
        
        # Classify intent
        intent = await self._classify_intent(message)
        
        # Search products if needed
        product_context = ""
        if intent in ["search", "question", "recommendation"]:
            search_results = await self.file_search.search(
                query=message,
                top_k=10
            )
            product_context = self._format_search_results(search_results)
        
        # Generate response
        response = await self._generate_response(
            message=message,
            intent=intent,
            product_context=product_context,
            conversation_context=context
        )
        
        return response
    
    async def _classify_intent(self, message: str) -> str:
        """Classify the user's intent."""
        
        client = genai.Client()
        
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=f"""
            Classify this customer message into one of these intents:
            - search: Looking for products
            - question: Asking about a specific product
            - recommendation: Wants suggestions
            - order: Question about an order
            - help: General help/support question
            - greeting: Hello/Hi
            - farewell: Goodbye/Thanks
            - other: Doesn't fit other categories
            
            Message: "{message}"
            
            Return only the intent word, nothing else.
            """
        )
        
        return response.text.strip().lower()
    
    def _format_search_results(self, results: list) -> str:
        """Format search results for context."""
        
        if not results:
            return "No matching products found in the catalogue."
        
        formatted = "RELEVANT PRODUCTS FROM CATALOGUE:\n\n"
        for i, result in enumerate(results[:5], 1):
            formatted += f"{i}. {result.get('content', '')}\n\n---\n\n"
        
        return formatted
    
    async def _generate_response(
        self,
        message: str,
        intent: str,
        product_context: str,
        conversation_context: str
    ) -> AssistantResponse:
        """Generate the assistant's response."""
        
        client = genai.Client()
        
        prompt = f"""
{self.system_instruction}

CONVERSATION HISTORY:
{conversation_context}

{product_context}

USER MESSAGE: {message}

Generate a helpful response. Include:
1. A natural, conversational message
2. Product recommendations if relevant (with exact names, prices, and handles from the catalogue)
3. 2-3 follow-up questions to continue helping

Return as JSON:
{{
    "message": "Your response message with [Product Name](/products/handle) links",
    "recommendations": [
        {{
            "product_id": "id from catalogue",
            "title": "Product Title",
            "handle": "product-handle",
            "reason": "Why this product fits their needs",
            "price": "€XX.XX"
        }}
    ],
    "follow_up_questions": ["Question 1?", "Question 2?"],
    "intent": "{intent}"
}}
"""
        
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=prompt,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
        data = json.loads(response.text)
        return AssistantResponse(**data)
    
    def _build_context(self, history: List[dict], user_context: dict) -> str:
        """Build conversation context string."""
        
        context_parts = []
        
        # Add conversation history
        if history:
            for msg in history[-10:]:  # Last 10 messages
                role = "Customer" if msg["role"] == "user" else "Assistant"
                context_parts.append(f"{role}: {msg['content']}")
        
        # Add user context
        if user_context:
            if user_context.get("cart_items"):
                context_parts.append(f"Customer's cart: {user_context['cart_items']}")
            if user_context.get("recently_viewed"):
                context_parts.append(f"Recently viewed: {user_context['recently_viewed']}")
        
        return "\n".join(context_parts) if context_parts else "No previous context."
```

### 2.4 Streaming Response Implementation

```python
# functions/main.py (continued)
from firebase_functions import https_fn, options
from agents.buyer_assistant import BuyerAssistantAgent
from firebase_admin import firestore, auth
import json

@https_fn.on_request(
    region="europe-west1",
    memory=options.MemoryOption.GB_1,
    timeout_sec=120,
    cors=options.CorsOptions(
        cors_origins=["*"],
        cors_methods=["POST", "OPTIONS"],
    )
)
def chat_assistant_stream(req: https_fn.Request) -> https_fn.Response:
    """
    Streaming chat endpoint for the buyer assistant.
    Uses Server-Sent Events (SSE) for real-time response streaming.
    """
    
    # Handle CORS preflight
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    
    # Verify authentication
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return https_fn.Response(
            json.dumps({"error": "Unauthorized"}),
            status=401,
            content_type="application/json"
        )
    
    try:
        token = auth_header.split("Bearer ")[1]
        decoded = auth.verify_id_token(token)
        client_id = decoded.get("clientId")
        user_id = decoded["uid"]
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": "Invalid token"}),
            status=401,
            content_type="application/json"
        )
    
    # Parse request
    data = req.get_json()
    message = data.get("message")
    session_id = data.get("sessionId")
    
    if not message:
        return https_fn.Response(
            json.dumps({"error": "Message required"}),
            status=400,
            content_type="application/json"
        )
    
    # Get or create session
    db = firestore.client()
    session_ref = db.collection(f"clients/{client_id}/chat_sessions").document(session_id or "new")
    
    if session_id:
        session = session_ref.get()
        history = session.to_dict().get("messages", []) if session.exists else []
    else:
        session_ref = db.collection(f"clients/{client_id}/chat_sessions").document()
        history = []
    
    # Initialize agent
    agent = BuyerAssistantAgent(client_id)
    
    def generate():
        """Generator for SSE streaming."""
        
        try:
            # Process message
            response = agent.process_message(
                message=message,
                conversation_history=history,
                user_context=data.get("context")
            )
            
            # Stream the response in chunks
            # In production, this would use actual streaming from Gemini
            words = response.message.split()
            buffer = ""
            
            for i, word in enumerate(words):
                buffer += word + " "
                if i % 5 == 0:  # Send every 5 words
                    yield f"data: {json.dumps({'type': 'text', 'content': buffer})}\n\n"
                    buffer = ""
            
            if buffer:
                yield f"data: {json.dumps({'type': 'text', 'content': buffer})}\n\n"
            
            # Send recommendations
            if response.recommendations:
                yield f"data: {json.dumps({'type': 'recommendations', 'content': [r.dict() for r in response.recommendations]})}\n\n"
            
            # Send follow-up questions
            if response.follow_up_questions:
                yield f"data: {json.dumps({'type': 'follow_ups', 'content': response.follow_up_questions})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done', 'sessionId': session_ref.id})}\n\n"
            
            # Save to session history
            history.append({"role": "user", "content": message})
            history.append({
                "role": "assistant",
                "content": response.message,
                "recommendations": [r.dict() for r in response.recommendations],
                "intent": response.intent
            })
            
            session_ref.set({
                "userId": user_id,
                "messages": history,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }, merge=True)
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return https_fn.Response(
        generate(),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

### 2.5 React Chat UI with Vercel AI SDK

```typescript
// components/chat/ChatWidget.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, Message } from 'ai/react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ProductRecommendationCard } from './ProductRecommendationCard';

interface ProductRecommendation {
  product_id: string;
  title: string;
  handle: string;
  reason: string;
  price: string;
  image_url?: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: '/api/ai/chat',
    headers: {
      'Authorization': `Bearer ${user?.accessToken}`,
    },
    body: {
      sessionId,
    },
    onResponse: (response) => {
      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'recommendations':
                  setRecommendations(data.content);
                  break;
                case 'follow_ups':
                  setFollowUps(data.content);
                  break;
                case 'done':
                  setSessionId(data.sessionId);
                  break;
              }
            }
          }
        }
      };
      
      processStream();
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send follow-up question
  const handleFollowUp = (question: string) => {
    handleInputChange({ target: { value: question } } as any);
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true }));
    }, 0);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Shopping Assistant</h3>
          <p className="text-sm text-muted-foreground">How can I help you today?</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>👋 Hi! I'm here to help you find the perfect products.</p>
              <p className="text-sm mt-2">Ask me anything about our catalogue!</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          
          {/* Product Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recommended for you:</p>
              {recommendations.map((rec, index) => (
                <ProductRecommendationCard key={index} recommendation={rec} />
              ))}
            </div>
          )}
          
          {/* Follow-up Questions */}
          {followUps.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {followUps.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFollowUp(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about products..."
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

```typescript
// components/chat/ChatMessage.tsx
import { Message } from 'ai/react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <ReactMarkdown
          components={{
            // Convert product links to Next.js Links
            a: ({ href, children }) => {
              if (href?.startsWith('/products/')) {
                return (
                  <Link href={href} className="text-blue-500 hover:underline">
                    {children}
                  </Link>
                );
              }
              return <a href={href} className="text-blue-500 hover:underline">{children}</a>;
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

```typescript
// components/chat/ProductRecommendationCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

interface ProductRecommendation {
  product_id: string;
  title: string;
  handle: string;
  reason: string;
  price: string;
  image_url?: string;
}

export function ProductRecommendationCard({ recommendation }: { recommendation: ProductRecommendation }) {
  const { addItem } = useCart();

  return (
    <Card className="p-3 flex gap-3">
      {recommendation.image_url && (
        <div className="w-16 h-16 relative flex-shrink-0">
          <Image
            src={recommendation.image_url}
            alt={recommendation.title}
            fill
            className="object-cover rounded"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${recommendation.handle}`} className="font-medium hover:underline line-clamp-1">
          {recommendation.title}
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2">{recommendation.reason}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-semibold">{recommendation.price}</span>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/products/${recommendation.handle}`}>View</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

### 2.6 Session and Context Management

```typescript
// hooks/useChatSession.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  intent?: string;
  timestamp?: Date;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  updatedAt: Date;
}

export function useChatSession(sessionId?: string) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, clientId } = useAuth();
  const db = getFirebaseDb();

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId || !clientId) {
      setLoading(false);
      return;
    }

    const sessionRef = doc(db, `clients/${clientId}/chat_sessions`, sessionId);
    
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession({
          id: snapshot.id,
          ...snapshot.data(),
        } as ChatSession);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId, clientId, db]);

  // Get recent sessions
  const getRecentSessions = useCallback(async () => {
    if (!clientId || !user) return [];

    const sessionsRef = collection(db, `clients/${clientId}/chat_sessions`);
    const q = query(
      sessionsRef,
      orderBy('updatedAt', 'desc'),
      limit(10)
    );

    // This would be implemented with getDocs
    return [];
  }, [clientId, user, db]);

  return {
    session,
    loading,
    getRecentSessions,
  };
}

// Context provider for chat state
// providers/ChatProvider.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { useCart } from '@/hooks/useCart';

interface ChatContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  getUserContext: () => Record<string, any>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { cart, lines } = useCart();

  const getUserContext = () => {
    return {
      cart_items: lines.map(line => ({
        title: line.merchandise.product.title,
        variant: line.merchandise.title,
        quantity: line.quantity,
      })),
      cart_total: cart?.cost?.totalAmount?.amount,
      // Add recently viewed products from localStorage
      recently_viewed: JSON.parse(localStorage.getItem('recentlyViewed') || '[]').slice(0, 5),
    };
  };

  return (
    <ChatContext.Provider value={{ sessionId, setSessionId, getUserContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
```

### 2.7 Per-Client Customization

```typescript
// Admin interface for configuring the AI assistant
// app/admin/ai-settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface AIAssistantConfig {
  persona: string;
  language: string;
  storeName: string;
  domainKnowledge: string;
  tone: string;
  greetingMessage: string;
  enabledFeatures: {
    productSearch: boolean;
    orderTracking: boolean;
    recommendations: boolean;
  };
}

const DEFAULT_CONFIG: AIAssistantConfig = {
  persona: 'friendly shopping assistant',
  language: 'en',
  storeName: 'Our Store',
  domainKnowledge: '',
  tone: 'helpful and professional',
  greetingMessage: 'Hi! How can I help you find the perfect product today?',
  enabledFeatures: {
    productSearch: true,
    orderTracking: true,
    recommendations: true,
  },
};

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIAssistantConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const { clientId } = useAuth();
  const db = getFirebaseDb();

  useEffect(() => {
    if (!clientId) return;

    const loadConfig = async () => {
      const docRef = doc(db, `clients/${clientId}/settings`, 'ai_assistant');
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snapshot.data() });
      }
    };

    loadConfig();
  }, [clientId, db]);

  const handleSave = async () => {
    if (!clientId) return;

    setSaving(true);
    try {
      const docRef = doc(db, `clients/${clientId}/settings`, 'ai_assistant');
      await setDoc(docRef, config);
      toast.success('AI Assistant settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Assistant Settings</h1>
        <p className="text-muted-foreground">
          Customize how your AI shopping assistant interacts with customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personality & Tone</CardTitle>
          <CardDescription>
            Define the assistant's personality to match your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={config.storeName}
                onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                placeholder="Your Store Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={config.language}
                onValueChange={(value) => setConfig({ ...config, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="el">Greek (Ελληνικά)</SelectItem>
                  <SelectItem value="de">German (Deutsch)</SelectItem>
                  <SelectItem value="fr">French (Français)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona">Persona Description</Label>
            <Input
              id="persona"
              value={config.persona}
              onChange={(e) => setConfig({ ...config, persona: e.target.value })}
              placeholder="e.g., friendly fashion expert, knowledgeable tech advisor"
            />
            <p className="text-sm text-muted-foreground">
              Describe who the assistant should be (e.g., "friendly Greek grandmother who loves cooking")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Communication Tone</Label>
            <Select
              value={config.tone}
              onValueChange={(value) => setConfig({ ...config, tone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helpful and professional">Professional</SelectItem>
                <SelectItem value="friendly and casual">Casual & Friendly</SelectItem>
                <SelectItem value="enthusiastic and energetic">Enthusiastic</SelectItem>
                <SelectItem value="warm and caring">Warm & Caring</SelectItem>
                <SelectItem value="expert and authoritative">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting Message</Label>
            <Textarea
              id="greeting"
              value={config.greetingMessage}
              onChange={(e) => setConfig({ ...config, greetingMessage: e.target.value })}
              placeholder="The first message customers see when opening the chat"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain Knowledge</CardTitle>
          <CardDescription>
            Add specific knowledge about your products, policies, or industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.domainKnowledge}
            onChange={(e) => setConfig({ ...config, domainKnowledge: e.target.value })}
            placeholder={`Example:
- We specialize in handmade jewelry from Greek artisans
- All products are made with 925 sterling silver
- We offer free shipping on orders over €50
- Returns accepted within 30 days
- Our most popular collection is the "Aegean Dreams" line`}
            rows={10}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Include information about your products, shipping policies, return policies, 
            brand story, or any other details the assistant should know.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Appendix: AI System Configuration

### Environment Variables for AI

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your_api_key
GOOGLE_CLOUD_PROJECT=your_project_id

# AI Assistant Defaults
AI_DEFAULT_MODEL=gemini-1.5-pro
AI_EMBEDDING_MODEL=text-embedding-004
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7

# RAG Configuration
RAG_TOP_K=10
RAG_SIMILARITY_THRESHOLD=0.7
RAG_REINDEX_INTERVAL_HOURS=24
```

### Firestore Collections Structure

```
clients/{clientId}/
├── settings/
│   ├── ai_assistant          # Assistant configuration
│   └── ai_index              # Index metadata
├── ai_jobs/
│   └── {jobId}/
│       ├── (job document)    # Job status and metadata
│       └── products/         # Extracted products subcollection
│           └── {productId}
└── chat_sessions/
    └── {sessionId}           # Chat history and context
```

### Key Dependencies

```txt
# requirements.txt for Firebase Functions
google-adk>=0.1.0
google-genai>=0.1.0
firebase-admin>=6.0.0
firebase-functions>=0.1.0
pandas>=2.0.0
openpyxl>=3.1.0
PyMuPDF>=1.23.0
pydantic>=2.0.0
tenacity>=8.0.0
```

### Rate Limits and Quotas

| Service | Limit | Notes |
|---------|-------|-------|
| Gemini 1.5 Pro | 60 RPM, 1M TPM | Per project |
| Gemini 1.5 Flash | 60 RPM, 1M TPM | Per project |
| FileSearchTool | 100 queries/min | Per corpus |
| Cloud Functions | 540s max timeout | For long-running jobs |
| Firestore | 10,000 writes/sec | Per database |
