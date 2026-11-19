import os
import re
import uuid
import json
from typing import Dict, Any, List, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from app.models.contact import Contact, Company, ImportJob
from app.schemas.contact_schema import ColumnMapping, RowValidationResult

def normalize_phone_number(phone: Any) -> str:
    """
    Cleans and standardizes phone numbers into E.164 compatible format.
    Handles Indian mobile numbers (10 digits starting with 6,7,8,9),
    strips leading zeros, spaces, dashes, and parentheses.
    """
    if pd.isna(phone) or phone is None:
        return ""
    
    # Convert float or int (e.g. from Excel) to string without decimals
    raw_str = str(phone).split(".")[0].strip()
    # Remove all non-numeric characters except leading plus
    cleaned = re.sub(r"[^\d+]", "", raw_str)
    
    # If starts with +91, keep it
    if cleaned.startswith("+91") and len(cleaned) == 13:
        return cleaned
    
    # If starts with 91 and is 12 digits
    if cleaned.startswith("91") and len(cleaned) == 12:
        return f"+{cleaned}"
    
    # If starts with 0 and is 11 digits (e.g. 09876543210)
    if cleaned.startswith("0") and len(cleaned) == 11:
        return f"+91{cleaned[1:]}"
    
    # Standard 10 digit Indian number
    digits_only = re.sub(r"\D", "", cleaned)
    if len(digits_only) == 10 and digits_only[0] in "6789":
        return f"+91{digits_only}"
    
    # If already has plus and valid length
    if cleaned.startswith("+") and 10 <= len(cleaned) <= 16:
        return cleaned
        
    return f"+{digits_only}" if digits_only else ""


class CsvImportService:
    @staticmethod
    def read_dataframe(file_path: str) -> pd.DataFrame:
        """Reads CSV or Excel file safely with fallback encodings."""
        if file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path, dtype=str)
        else:
            try:
                df = pd.read_csv(file_path, dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, dtype=str, encoding="latin1")
        
        # Clean column names (strip whitespace)
        df.columns = [str(c).strip() for c in df.columns]
        # Fill NaN with empty string
        df = df.fillna("")
        return df

    @staticmethod
    def extract_headers_and_samples(file_path: str) -> Tuple[List[str], int, List[Dict[str, Any]]]:
        """Extracts column headers, row count, and first 5 sample rows."""
        df = CsvImportService.read_dataframe(file_path)
        headers = list(df.columns)
        total_rows = len(df)
        sample_rows = df.head(5).to_dict(orient="records")
        return headers, total_rows, sample_rows

    @staticmethod
    def preview_import(
        file_path: str,
        mapping: ColumnMapping,
        duplicate_strategy: str,
        db: Session
    ) -> Dict[str, Any]:
        """Dry-runs validation and detects duplicates against existing DB contacts."""
        df = CsvImportService.read_dataframe(file_path)
        total_rows = len(df)
        
        # Pre-fetch existing active phones and emails to detect duplicates quickly in memory
        existing_phones = set(row[0] for row in db.query(Contact.phone).filter(Contact.is_deleted == False).all() if row[0])
        existing_emails = set(row[0].lower() for row in db.query(Contact.email).filter(Contact.is_deleted == False).all() if row[0])
        
        seen_phones_in_file = set()
        
        valid_count = 0
        duplicate_count = 0
        invalid_count = 0
        sample_preview: List[RowValidationResult] = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 1
            first_name = str(row.get(mapping.first_name, "")).strip()
            raw_phone = str(row.get(mapping.phone, "")).strip()
            raw_email = str(row.get(mapping.email, "")).strip().lower() if mapping.email else ""
            
            normalized_phone = normalize_phone_number(raw_phone)
            
            # Validation rules
            if not first_name:
                invalid_count += 1
                if len(sample_preview) < 10:
                    sample_preview.append(RowValidationResult(
                        row_number=row_num,
                        data=dict(row),
                        status="INVALID",
                        reason="Missing first name"
                    ))
                continue

            if not normalized_phone or len(re.sub(r"\D", "", normalized_phone)) < 10:
                invalid_count += 1
                if len(sample_preview) < 10:
                    sample_preview.append(RowValidationResult(
                        row_number=row_num,
                        data=dict(row),
                        status="INVALID",
                        reason=f"Invalid phone number: '{raw_phone}'"
                    ))
                continue

            # Duplicate check
            is_duplicate = (
                normalized_phone in existing_phones or
                (raw_email and raw_email in existing_emails) or
                normalized_phone in seen_phones_in_file
            )

            seen_phones_in_file.add(normalized_phone)

            if is_duplicate:
                duplicate_count += 1
                if len(sample_preview) < 10:
                    sample_preview.append(RowValidationResult(
                        row_number=row_num,
                        data=dict(row),
                        status="DUPLICATE",
                        reason="Contact with this phone/email already exists"
                    ))
            else:
                valid_count += 1
                if len(sample_preview) < 10:
                    sample_preview.append(RowValidationResult(
                        row_number=row_num,
                        data=dict(row),
                        status="VALID",
                        reason=None
                    ))

        return {
            "total_rows": total_rows,
            "valid_count": valid_count,
            "duplicate_count": duplicate_count,
            "invalid_count": invalid_count,
            "sample_preview": [item.dict() for item in sample_preview]
        }

    @staticmethod
    def commit_import(
        file_path: str,
        mapping: ColumnMapping,
        duplicate_strategy: str,
        default_tags: List[str],
        db: Session
    ) -> ImportJob:
        """Executes the actual import transaction into PostgreSQL 18."""
        df = CsvImportService.read_dataframe(file_path)
        total_rows = len(df)
        
        imported_count = 0
        updated_count = 0
        skipped_duplicates = 0
        failed_count = 0
        errors = []

        # Cache existing companies by name to avoid duplicate company creation
        companies_cache: Dict[str, Company] = {
            c.name.lower(): c for c in db.query(Company).filter(Company.is_deleted == False).all()
        }

        job = ImportJob(
            filename=os.path.basename(file_path),
            total_rows=total_rows,
            status="PROCESSING"
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Pre-fetch existing active contacts in a single query to eliminate N+1 queries during bulk import
        existing_contacts = db.query(Contact).filter(Contact.is_deleted == False).all()
        phone_to_contact = {c.phone: c for c in existing_contacts if c.phone}
        email_to_contact = {c.email.lower(): c for c in existing_contacts if c.email}

        for idx, row in df.iterrows():
            row_num = int(idx) + 1
            first_name = str(row.get(mapping.first_name, "")).strip()
            last_name = str(row.get(mapping.last_name, "")).strip() if mapping.last_name else ""
            raw_phone = str(row.get(mapping.phone, "")).strip()
            email = str(row.get(mapping.email, "")).strip().lower() if mapping.email else ""
            company_name = str(row.get(mapping.company_name, "")).strip() if mapping.company_name else ""
            title = str(row.get(mapping.title, "")).strip() if mapping.title else ""
            
            # Row-level tags
            row_tags = list(default_tags)
            if mapping.tags and row.get(mapping.tags):
                custom_tags = [t.strip() for t in str(row.get(mapping.tags)).split(",") if t.strip()]
                row_tags.extend(custom_tags)
            row_tags = list(set(row_tags)) # deduplicate tags

            normalized_phone = normalize_phone_number(raw_phone)
            
            if not first_name or not normalized_phone:
                failed_count += 1
                errors.append(f"Row {row_num}: Missing required name or valid phone")
                continue

            # Zero N+1 query lookup from in-memory dictionary
            existing_contact = phone_to_contact.get(normalized_phone) or (email_to_contact.get(email) if email else None)

            if existing_contact:
                if duplicate_strategy == "SKIP":
                    skipped_duplicates += 1
                    continue
                elif duplicate_strategy == "UPDATE":
                    # Update existing contact
                    existing_contact.first_name = first_name
                    if last_name:
                        existing_contact.last_name = last_name
                    if email:
                        existing_contact.email = email
                    if title:
                        existing_contact.title = title
                    # Merge tags
                    existing_contact.tags = list(set((existing_contact.tags or []) + row_tags))
                    updated_count += 1
                    continue
                # If CREATE_NEW, fall through to insertion

            # Handle company creation / linking
            company_id = None
            if company_name:
                comp_key = company_name.lower()
                if comp_key in companies_cache:
                    company_id = companies_cache[comp_key].id
                else:
                    new_comp = Company(name=company_name)
                    db.add(new_comp)
                    db.flush() # Populate ID
                    companies_cache[comp_key] = new_comp
                    company_id = new_comp.id

            # Create new contact
            new_contact = Contact(
                first_name=first_name,
                last_name=last_name,
                phone=normalized_phone,
                email=email if email else None,
                company_id=company_id,
                title=title,
                consent_status="OPTED_IN",
                tags=row_tags
            )
            db.add(new_contact)
            phone_to_contact[normalized_phone] = new_contact
            if email:
                email_to_contact[email] = new_contact
            imported_count += 1

            # Commit in batches of 200 for high performance
            if (imported_count + updated_count) % 200 == 0:
                db.commit()

        # Final commit and job status update
        job.imported_rows = imported_count
        job.updated_rows = updated_count
        job.duplicate_rows = skipped_duplicates
        job.failed_rows = failed_count
        job.status = "COMPLETED"
        job.error_summary = errors[:50] # Store first 50 errors
        db.commit()
        db.refresh(job)

        return job
