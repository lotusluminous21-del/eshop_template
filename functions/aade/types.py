from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum
from datetime import date

class InvoiceType(Enum):
    SALES_INVOICE = "1.1"
    SERVICE_INVOICE = "2.1"
    RETAIL_RECEIPT = "11.1"
    CREDIT_NOTE = "5.1"

class VATExemption(Enum):
    WITHOUT_VAT_ART_22 = "1"
    # Add others as needed

@dataclass
class Party:
    vat_number: str
    country: str
    branch: int = 0
    name: str = ""
    address: str = ""
    city: str = ""
    postal_code: str = ""

@dataclass
class InvoiceRow:
    line_number: int
    net_value: float
    vat_category: int  # 1=24%, 2=13%, ...
    vat_amount: float
    discount_option: bool = False
    
    @property
    def total_value(self):
        return self.net_value + self.vat_amount

@dataclass
class InvoiceSummary:
    total_net_value: float
    total_vat_amount: float
    total_withheld_amount: float = 0.0
    total_fees_amount: float = 0.0
    total_stamp_duty_amount: float = 0.0
    total_deductions_amount: float = 0.0
    total_gross_value: float = 0.0
    classification_type: Optional[str] = None
    classification_category: Optional[str] = None

@dataclass
class AADEInvoice:
    uid: str  # Internal unique ID
    mark: Optional[int] = None  # Received from AADE
    cancelled_mark: Optional[int] = None
    
    issuer: Party = None
    counterpart: Party = None
    
    invoice_type: InvoiceType = InvoiceType.RETAIL_RECEIPT
    series: str = "A"
    aa: str = "1"
    issue_date: date = None
    currency: str = "EUR"
    
    rows: List[InvoiceRow] = field(default_factory=list)
    summary: InvoiceSummary = None
    
    payment_method: int = 5  # 5=Web Banking, 1=Cash
