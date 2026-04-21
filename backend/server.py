from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from bson import ObjectId
from bson.errors import InvalidId
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

WHATSAPP_SERVICE_URL = os.environ.get('WHATSAPP_SERVICE_URL', 'http://localhost:3001')

app = FastAPI()
api_router = APIRouter(prefix="/api")

def validate_object_id(id_str: str, name: str = "ID") -> ObjectId:
    """Validate and convert a string to ObjectId, raising 400 if invalid."""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {name}: {id_str}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# Notification System
# ==========================================

async def create_notification(user_id: str, notif_type: str, title: str, message: str, lead_id: str = None, send_whatsapp: bool = True):
    """Create in-app notification and optionally send WhatsApp push."""
    notif_doc = {
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "lead_id": lead_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif_doc)
    
    if send_whatsapp:
        try:
            # Find user's phone to send WhatsApp notification
            user = await db.users.find_one({"_id": validate_object_id(user_id, "user")})
            if user and user.get("phone"):
                phone = user["phone"]
                wa_message = f"*{title}*\n{message}"
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    await http_client.post(f"{WHATSAPP_SERVICE_URL}/send-message", json={
                        "userId": user_id,
                        "phoneNumber": phone,
                        "message": wa_message
                    })
        except Exception as e:
            logger.warning(f"WhatsApp notification failed for {user_id}: {e}")

async def notify_managers(notif_type: str, title: str, message: str, lead_id: str = None):
    """Send notification to all admins and sales managers."""
    managers = await db.users.find({
        "role": {"$in": [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.CLUB_MANAGER]},
        "active": True
    }).to_list(100)
    for mgr in managers:
        await create_notification(str(mgr["_id"]), notif_type, title, message, lead_id)
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'xac_crm_secret_key_2026_revival_fitness')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserRole:
    ADMIN = "admin"
    SALES_MANAGER = "sales_manager"
    CLUB_MANAGER = "club_manager"
    CONSULTANT = "consultant"
    ASSISTANT = "assistant"
    MARKETING_AGENT = "marketing_agent"

class LeadStage:
    NEW_LEAD = "New Lead"
    CONTACTED = "Contacted"
    ENGAGED = "Engaged"
    APPOINTMENT_SET = "Appointment Set"
    SHOWED_UP = "Showed Up"
    TRIAL = "Trial / Consultation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"
    INVALID = "Invalid"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    phone: Optional[str] = None
    active: bool = True
    linked_consultants: List[str] = []

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    active: bool
    linked_consultants: List[str] = []
    created_at: str
    earnings_scale: Optional[Dict[str, Any]] = None
    plain_password: Optional[str] = None

class LeadCreate(BaseModel):
    name: str
    surname: Optional[str] = None
    email: Optional[str] = None
    phone: str
    source: str
    campaign: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    form_answers: Optional[Dict[str, Any]] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    stage: Optional[str] = None
    owner_id: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    form_answers: Optional[Dict[str, Any]] = None

class LeadResponse(BaseModel):
    id: str
    name: str
    surname: Optional[str] = None
    email: Optional[str] = None
    phone: str
    source: str
    campaign: Optional[str] = None
    stage: str
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    form_answers: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
    last_contact: Optional[str] = None

class ActivityCreate(BaseModel):
    lead_id: str
    activity_type: str
    content: str
    notes: Optional[str] = None

class DealCreate(BaseModel):
    lead_id: str
    deal_date: str
    closed_by: str
    to_by: str
    payment_type: str
    sales_value: Optional[float] = None
    term: Optional[int] = None
    units: Optional[int] = None
    joining_fee: Optional[float] = None
    debit_order_value: Optional[float] = None

class SettingsUpdate(BaseModel):
    auto_followup_hours: Optional[int] = None
    auto_reassign_hours: Optional[int] = None
    whatsapp_template: Optional[str] = None
    logo_url: Optional[str] = None
    month_start_date: Optional[str] = None
    month_end_date: Optional[str] = None

class WhatsAppMessageRequest(BaseModel):
    phone_number: str
    message: str
    lead_id: Optional[str] = None
    template_id: Optional[str] = None

class MessageTemplateCreate(BaseModel):
    name: str
    content: str
    user_id: Optional[str] = None

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None

class AppointmentCreate(BaseModel):
    lead_id: str
    scheduled_at: str
    notes: Optional[str] = None
    booked_by: Optional[str] = None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": validate_object_id(user_id, "user")})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_next_consultant_for_assignment():
    consultants = await db.users.find({
        "role": UserRole.CONSULTANT,
        "active": True
    }).to_list(100)
    
    if not consultants:
        return None
    
    lead_counts = []
    for consultant in consultants:
        count = await db.leads.count_documents({
            "owner_id": str(consultant["_id"]),
            "stage": {"$nin": [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST]}
        })
        lead_counts.append({"consultant": consultant, "count": count})
    
    lead_counts.sort(key=lambda x: x["count"])
    return lead_counts[0]["consultant"] if lead_counts else None


@api_router.get("/branding")
async def get_branding():
    settings = await db.settings.find_one({"key": "system_settings"})
    return {
        "company_name": settings.get("company_name", "Revival Fitness") if settings else "Revival Fitness",
        "app_name": settings.get("app_name", "XAC CRM") if settings else "XAC CRM"
    }

@api_router.post("/auth/login")
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not pwd_context.verify(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    token = create_access_token({
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"]
    })
    
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "email": user_data.email,
        "password": hashed_password,
        "plain_password": user_data.password,
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "active": user_data.active,
        "linked_consultants": user_data.linked_consultants,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    
    return UserResponse(**user_doc)


# ==========================================
# Notification Endpoints
# ==========================================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(50)
    return [{
        "id": str(n["_id"]),
        "type": n["type"],
        "title": n["title"],
        "message": n["message"],
        "lead_id": n.get("lead_id"),
        "read": n.get("read", False),
        "created_at": n["created_at"]
    } for n in notifs]

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": str(current_user["_id"]),
        "read": False
    })
    return {"count": count}

@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": validate_object_id(notif_id, "notification"), "user_id": str(current_user["_id"])},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"]), "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    is_admin = current_user["role"] == UserRole.ADMIN
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    
    return [
        UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            active=user.get("active", True),
            linked_consultants=user.get("linked_consultants", []),
            created_at=user.get("created_at", ""),
            earnings_scale=user.get("earnings_scale"),
            plain_password=user.get("plain_password") if is_admin else None
        )
        for user in users
    ]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    if "password" in updates:
        updates["plain_password"] = updates["password"]
        updates["password"] = pwd_context.hash(updates["password"])
    
    await db.users.update_one({"_id": validate_object_id(user_id, "user")}, {"$set": updates})
    return {"success": True}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    await db.users.update_one({"_id": validate_object_id(user_id, "user")}, {"$set": {"active": False}})
    return {"success": True}

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    consultant = await get_next_consultant_for_assignment()
    
    lead_doc = {
        "name": lead_data.name,
        "surname": lead_data.surname or None,
        "email": lead_data.email or None,
        "phone": lead_data.phone,
        "source": lead_data.source,
        "campaign": lead_data.campaign or None,
        "stage": LeadStage.NEW_LEAD,
        "owner_id": str(consultant["_id"]) if consultant else None,
        "created_by": str(current_user["_id"]),
        "tags": lead_data.tags,
        "notes": lead_data.notes,
        "form_answers": lead_data.form_answers,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None
    }
    
    result = await db.leads.insert_one(lead_doc)
    lead_doc["id"] = str(result.inserted_id)
    
    await db.audit_logs.insert_one({
        "action": "lead_created",
        "lead_id": lead_doc["id"],
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {"source": lead_data.source}
    })
    
    # Log activity for timeline
    await db.activities.insert_one({
        "lead_id": lead_doc["id"],
        "user_id": str(current_user["_id"]),
        "activity_type": "lead_created",
        "content": f"Lead created from {lead_data.source}",
        "notes": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    if consultant:
        owner_name = consultant["name"]
        # Notify consultant: New Lead Assigned
        await create_notification(
            str(consultant["_id"]),
            "new_lead",
            "New Lead Assigned",
            f"{lead_data.name} ({lead_data.source}) has been assigned to you.",
            lead_doc["id"]
        )
    else:
        owner_name = None
    
    return LeadResponse(**lead_doc, owner_name=owner_name)

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    stage: Optional[str] = None,
    owner_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == UserRole.CONSULTANT:
        my_id = str(current_user["_id"])
        # Find assistants linked to this consultant
        linked_assistants = await db.users.find({
            "role": UserRole.ASSISTANT,
            "linked_consultants": my_id,
            "active": True
        }).to_list(100)
        assistant_ids = [str(a["_id"]) for a in linked_assistants]
        # Show leads owned by this consultant OR created by their linked assistants
        if assistant_ids:
            query["$or"] = [
                {"owner_id": my_id},
                {"created_by": {"$in": assistant_ids}}
            ]
        else:
            query["owner_id"] = my_id
    elif current_user["role"] == UserRole.ASSISTANT:
        linked = current_user.get("linked_consultants", [])
        if linked:
            query["owner_id"] = {"$in": linked}
    
    if stage:
        query["stage"] = stage
    if owner_id:
        query["owner_id"] = owner_id
    
    leads = await db.leads.find(query).to_list(1000)
    
    owner_ids = list(set([lead.get("owner_id") for lead in leads if lead.get("owner_id")]))
    owners = {}
    if owner_ids:
        users = await db.users.find({"_id": {"$in": [ObjectId(oid) for oid in owner_ids]}}).to_list(1000)
        owners = {str(user["_id"]): user["name"] for user in users}
    
    return [
        LeadResponse(
            id=str(lead["_id"]),
            name=lead["name"],
            surname=lead.get("surname"),
            email=lead.get("email"),
            phone=lead["phone"],
            source=lead["source"],
            campaign=lead.get("campaign"),
            stage=lead["stage"],
            owner_id=lead.get("owner_id"),
            owner_name=owners.get(lead.get("owner_id")),
            tags=lead.get("tags", []),
            notes=lead.get("notes"),
            form_answers=lead.get("form_answers"),
            created_at=lead.get("created_at", ""),
            updated_at=lead.get("updated_at", ""),
            last_contact=lead.get("last_contact")
        )
        for lead in leads
    ]

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"_id": validate_object_id(lead_id, "lead")})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    owner_name = None
    if lead.get("owner_id"):
        owner = await db.users.find_one({"_id": ObjectId(lead["owner_id"])})
        if owner:
            owner_name = owner["name"]
    
    return LeadResponse(
        id=str(lead["_id"]),
        name=lead["name"],
        surname=lead.get("surname"),
        email=lead.get("email"),
        phone=lead["phone"],
        source=lead["source"],
        campaign=lead.get("campaign"),
        stage=lead["stage"],
        owner_id=lead.get("owner_id"),
        owner_name=owner_name,
        tags=lead.get("tags", []),
        notes=lead.get("notes"),
        form_answers=lead.get("form_answers"),
        created_at=lead.get("created_at", ""),
        updated_at=lead.get("updated_at", ""),
        last_contact=lead.get("last_contact")
    )

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_update: LeadUpdate, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"_id": validate_object_id(lead_id, "lead")})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "stage" in update_data:
        old_stage = lead["stage"]
        new_stage = update_data["stage"]
        
        await db.audit_logs.insert_one({
            "action": "stage_changed",
            "lead_id": lead_id,
            "user_id": str(current_user["_id"]),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": {"from": old_stage, "to": new_stage}
        })
        
        # Log activity for timeline
        await db.activities.insert_one({
            "lead_id": lead_id,
            "user_id": str(current_user["_id"]),
            "activity_type": "stage_changed",
            "content": f"Stage changed from {old_stage} to {new_stage}",
            "notes": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Notify lead owner: Stage Changed
        if lead.get("owner_id") and lead["owner_id"] != str(current_user["_id"]):
            await create_notification(
                lead["owner_id"],
                "stage_changed",
                "Lead Stage Updated",
                f"{lead['name']} moved from {old_stage} to {new_stage}.",
                lead_id
            )
        
        # If lead is moved OUT of Closed Won, delete associated deals (deduct from MTD sales)
        if old_stage == LeadStage.CLOSED_WON and new_stage != LeadStage.CLOSED_WON:
            deleted = await db.deals.delete_many({"lead_id": lead_id})
            if deleted.deleted_count > 0:
                await db.audit_logs.insert_one({
                    "action": "deals_removed_stage_change",
                    "lead_id": lead_id,
                    "user_id": str(current_user["_id"]),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "details": {"deals_deleted": deleted.deleted_count, "reason": f"Lead moved from Closed Won to {new_stage}"}
                })
    
    await db.leads.update_one({"_id": validate_object_id(lead_id, "lead")}, {"$set": update_data})
    
    return {"success": True}


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.CONSULTANT]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    lead = await db.leads.find_one({"_id": validate_object_id(lead_id, "lead")})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Delete associated deals, activities, appointments
    await db.deals.delete_many({"lead_id": lead_id})
    await db.activities.delete_many({"lead_id": lead_id})
    await db.appointments.delete_many({"lead_id": lead_id})
    await db.leads.delete_one({"_id": validate_object_id(lead_id, "lead")})
    
    await db.audit_logs.insert_one({
        "action": "lead_deleted",
        "lead_id": lead_id,
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {"lead_name": lead.get("name", "")}
    })
    
    return {"success": True}

@api_router.post("/leads/{lead_id}/reassign")
async def reassign_lead(lead_id: str, new_owner_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Only managers can reassign leads")
    
    await db.leads.update_one(
        {"_id": validate_object_id(lead_id, "lead")},
        {"$set": {"owner_id": new_owner_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.audit_logs.insert_one({
        "action": "lead_reassigned",
        "lead_id": lead_id,
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {"new_owner_id": new_owner_id}
    })
    
    return {"success": True}

@api_router.post("/leads/fetch-check")
async def fetch_check_leads(current_user: dict = Depends(get_current_user)):
    """Check all sources for new leads - Meta webhooks, pending imports, etc."""
    new_leads = 0
    sources_checked = []
    
    # 1. Check Meta webhook logs for any unprocessed entries
    unprocessed = await db.webhook_logs.find({"status": {"$ne": "processed"}}).to_list(100)
    meta_found = 0
    for log in unprocessed:
        try:
            payload = log.get("payload", {})
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    field_data = value.get("field_data", [])
                    name, surname, phone, email = "Meta Lead", "", "", ""
                    lead_fields_raw = {}
                    for field in field_data:
                        fname = field.get("name", "").lower()
                        vals = field.get("values", [])
                        if vals:
                            lead_fields_raw[fname] = vals[0]
                        if fname in ["full_name", "name", "first_name"] and vals:
                            name = vals[0]
                        elif fname in ["last_name", "surname"] and vals:
                            surname = vals[0]
                        elif fname in ["phone_number", "phone", "whatsapp_number", "whatsapp", "cell", "mobile"] and vals:
                            phone = vals[0]
                        elif fname in ["email", "email_address"] and vals:
                            email = vals[0]
                    
                    # Split full_name into name + surname if no separate surname
                    if not surname and name and " " in name:
                        parts = name.strip().split(" ", 1)
                        name = parts[0]
                        surname = parts[1] if len(parts) > 1 else ""
                    
                    existing = None
                    if phone or email:
                        or_conditions = []
                        if phone:
                            or_conditions.append({"phone": phone})
                        if email:
                            or_conditions.append({"email": email})
                        existing = await db.leads.find_one({"$or": or_conditions})
                    
                    if not existing:
                        lead_doc = {
                            "name": name,
                            "surname": surname or None,
                            "phone": phone,
                            "email": email or None,
                            "source": "Facebook Lead Ad",
                            "stage": "New Lead",
                            "owner_id": None,
                            "form_answers": lead_fields_raw,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "notes": "Auto-imported from Meta fetch-check"
                        }
                        await db.leads.insert_one(lead_doc)
                        new_leads += 1
                        meta_found += 1
            
            await db.webhook_logs.update_one(
                {"_id": log["_id"]},
                {"$set": {"status": "processed"}}
            )
        except Exception as e:
            logger.error(f"Error processing webhook log: {e}")
    sources_checked.append({"source": "Meta Ads", "checked": True, "found": meta_found})
    
    # 2. Check for any leads without an owner (unassigned) - auto round-robin
    unassigned_count = await db.leads.count_documents({"owner_id": None})
    if unassigned_count > 0:
        consultants = await db.users.find({"role": "consultant", "active": True}).to_list(100)
        if consultants:
            unassigned_leads = await db.leads.find({"owner_id": None}).to_list(100)
            for i, lead in enumerate(unassigned_leads):
                consultant = consultants[i % len(consultants)]
                await db.leads.update_one(
                    {"_id": lead["_id"]},
                    {"$set": {"owner_id": str(consultant["_id"])}}
                )
    sources_checked.append({"source": "Round-Robin", "assigned": unassigned_count})
    
    total_leads = await db.leads.count_documents({})
    
    return {
        "success": True,
        "new_leads": new_leads,
        "unassigned_fixed": unassigned_count,
        "total_leads": total_leads,
        "sources_checked": sources_checked
    }


@api_router.post("/activities")
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    activity_doc = {
        "lead_id": activity.lead_id,
        "user_id": str(current_user["_id"]),
        "activity_type": activity.activity_type,
        "content": activity.content,
        "notes": activity.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.activities.insert_one(activity_doc)
    
    await db.leads.update_one(
        {"_id": ObjectId(activity.lead_id)},
        {"$set": {"last_contact": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@api_router.get("/activities/{lead_id}")
async def get_activities(lead_id: str, current_user: dict = Depends(get_current_user)):
    activities = await db.activities.find({"lead_id": lead_id}).sort("created_at", -1).to_list(100)
    
    user_ids = list(set([act["user_id"] for act in activities]))
    users = {}
    if user_ids:
        user_docs = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(100)
        users = {str(u["_id"]): u["name"] for u in user_docs}
    
    return [
        {
            "id": str(act["_id"]),
            "lead_id": act["lead_id"],
            "user_id": act["user_id"],
            "user_name": users.get(act["user_id"]),
            "activity_type": act["activity_type"],
            "content": act["content"],
            "notes": act.get("notes"),
            "created_at": act["created_at"]
        }
        for act in activities
    ]

@api_router.post("/deals")
async def create_deal(deal: DealCreate, current_user: dict = Depends(get_current_user)):
    deal_doc = {
        "lead_id": deal.lead_id,
        "deal_date": deal.deal_date,
        "closed_by": deal.closed_by,
        "to_by": deal.to_by,
        "payment_type": deal.payment_type,
        "sales_value": deal.sales_value,
        "term": deal.term,
        "units": deal.units,
        "joining_fee": deal.joining_fee,
        "debit_order_value": deal.debit_order_value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.deals.insert_one(deal_doc)
    
    await db.leads.update_one(
        {"_id": ObjectId(deal.lead_id)},
        {"$set": {"stage": LeadStage.CLOSED_WON}}
    )
    
    # Log activity for timeline
    deal_value = deal.sales_value or deal.debit_order_value or 0
    await db.activities.insert_one({
        "lead_id": deal.lead_id,
        "user_id": str(current_user["_id"]),
        "activity_type": "deal_closed",
        "content": f"Deal closed — {deal.payment_type} R{deal_value}",
        "notes": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Notify managers: New Deal Closed
    lead = await db.leads.find_one({"_id": ObjectId(deal.lead_id)})
    lead_name = lead["name"] if lead else "Unknown"
    deal_value = deal.sales_value or deal.debit_order_value or 0
    await notify_managers(
        "deal_closed",
        "New Deal Closed!",
        f"{lead_name} — {deal.payment_type} R{deal_value} closed by {current_user['name']}.",
        deal.lead_id
    )
    
    return {"success": True, "deal_id": str(result.inserted_id)}

@api_router.get("/deals")
async def get_deals(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if from_date and to_date:
        query["deal_date"] = {"$gte": from_date, "$lte": to_date}
    
    deals = await db.deals.find(query).to_list(1000)
    
    return [
        {
            "id": str(deal["_id"]),
            "lead_id": deal["lead_id"],
            "deal_date": deal["deal_date"],
            "closed_by": deal["closed_by"],
            "to_by": deal["to_by"],
            "payment_type": deal["payment_type"],
            "sales_value": deal.get("sales_value"),
            "term": deal.get("term"),
            "units": deal.get("units"),
            "joining_fee": deal.get("joining_fee"),
            "debit_order_value": deal.get("debit_order_value"),
            "created_at": deal["created_at"]
        }
        for deal in deals
    ]

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == UserRole.CONSULTANT:
        query["owner_id"] = str(current_user["_id"])
    
    total_leads = await db.leads.count_documents(query)
    
    closed_won_query = {**query, "stage": LeadStage.CLOSED_WON}
    closed_won = await db.leads.count_documents(closed_won_query)
    
    conversion_rate = (closed_won / total_leads * 100) if total_leads > 0 else 0
    
    deals_query = {}
    if current_user["role"] == UserRole.CONSULTANT:
        deals_query["closed_by"] = str(current_user["_id"])
    
    deals = await db.deals.find(deals_query).to_list(1000)
    
    invalid_lead_ids = []
    invalid_leads = await db.leads.find({"stage": LeadStage.INVALID}).to_list(1000)
    invalid_lead_ids = [str(lead["_id"]) for lead in invalid_leads]
    
    cash_total = sum(
        d.get("sales_value", 0) or 0 
        for d in deals 
        if d["payment_type"] == "Cash" and d["lead_id"] not in invalid_lead_ids
    )
    debit_total = sum(
        d.get("debit_order_value", 0) or 0 
        for d in deals 
        if d["payment_type"] == "Debit Order" and d["lead_id"] not in invalid_lead_ids
    )
    total_units = sum(
        d.get("units", 0) or 0 
        for d in deals 
        if d["lead_id"] not in invalid_lead_ids
    )
    
    return {
        "total_leads": total_leads,
        "closed_won": closed_won,
        "conversion_rate": round(conversion_rate, 2),
        "cash_sales": round(cash_total, 2),
        "debit_sales": round(debit_total, 2),
        "total_units": total_units
    }

@api_router.get("/dashboard/assistant-stats")
async def get_assistant_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    linked = current_user.get("linked_consultants", [])

    # Total leads for linked consultants
    lead_query = {"owner_id": {"$in": linked}} if linked else {"owner_id": user_id}
    total_leads = await db.leads.count_documents(lead_query)

    # Appointments booked by this assistant
    apt_query = {"booked_by": user_id}
    total_appointments = await db.appointments.count_documents(apt_query)

    # Conversion = lead to appointment ratio
    conversion_rate = (total_appointments / total_leads * 100) if total_leads > 0 else 0

    # Count deals (not values) for linked consultants
    deal_query = {"closed_by": {"$in": linked}} if linked else {}
    deals = await db.deals.find(deal_query).to_list(1000)
    cash_deals_count = sum(1 for d in deals if d["payment_type"] == "Cash")
    debit_deals_count = sum(1 for d in deals if d["payment_type"] == "Debit Order")

    # Appointment trend (last 6 months)
    appointment_trend = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_dt = now - timedelta(days=30 * i)
        month_str = month_dt.strftime("%Y-%m")
        month_label = month_dt.strftime("%b")
        count = await db.appointments.count_documents({
            "booked_by": user_id,
            "scheduled_at": {"$regex": f"^{month_str}"}
        })
        appointment_trend.append({"month": month_label, "appointments": count})

    # Today's appointments
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_apts = await db.appointments.find({"booked_by": user_id, "scheduled_at": {"$regex": f"^{today}"}}).to_list(100)
    lead_ids = [apt["lead_id"] for apt in today_apts]
    leads_dict = {}
    if lead_ids:
        ld = await db.leads.find({"_id": {"$in": [ObjectId(lid) for lid in lead_ids]}}).to_list(100)
        leads_dict = {str(l["_id"]): l for l in ld}

    today_appointments = [
        {
            "id": str(apt["_id"]),
            "lead_name": leads_dict.get(apt["lead_id"], {}).get("name", "Unknown"),
            "lead_surname": leads_dict.get(apt["lead_id"], {}).get("surname"),
            "scheduled_at": apt["scheduled_at"],
            "notes": apt.get("notes")
        }
        for apt in today_apts
    ]

    return {
        "total_leads": total_leads,
        "total_appointments": total_appointments,
        "conversion_rate": round(conversion_rate, 2),
        "cash_deals_count": cash_deals_count,
        "debit_deals_count": debit_deals_count,
        "appointment_trend": appointment_trend,
        "today_appointments": today_appointments
    }

def calculate_debit_commission(total_units, tiers):
    """Calculate debit order commission based on unit tiers. Rate is Rand per unit."""
    if not tiers:
        return 0
    # Sort tiers by min_units
    sorted_tiers = sorted(tiers, key=lambda t: t.get("min_units", 0))
    applicable_rate = 0
    for tier in sorted_tiers:
        if total_units >= tier.get("min_units", 0):
            applicable_rate = tier.get("rate", 0)
    return total_units * applicable_rate

def calculate_cash_commission(total_value, tiers):
    """Calculate cash sales commission based on value tiers. Rate is a percentage."""
    if not tiers:
        return 0
    sorted_tiers = sorted(tiers, key=lambda t: t.get("min_value", 0))
    applicable_pct = 0
    for tier in sorted_tiers:
        if total_value >= tier.get("min_value", 0):
            applicable_pct = tier.get("percentage", 0)
    return total_value * applicable_pct / 100

async def _resolve_commission_target(user_id, current_user):
    """Resolve which user the commission report is for."""
    if user_id and current_user["role"] == UserRole.ADMIN:
        target_user = await db.users.find_one({"_id": validate_object_id(user_id, "user")})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        return target_user
    elif current_user["role"] in [UserRole.CONSULTANT, UserRole.ASSISTANT]:
        return current_user
    raise HTTPException(status_code=400, detail="user_id required for admin")

async def _get_commission_deals(target_id, month_start, month_end):
    """Fetch and categorize deals for a consultant in a given period."""
    deal_query = {"closed_by": target_id}
    if month_start and month_end:
        deal_query["deal_date"] = {"$gte": month_start, "$lte": month_end}
    
    deals = await db.deals.find(deal_query).to_list(1000)
    lead_ids = list(set([d["lead_id"] for d in deals]))
    leads_dict = {}
    if lead_ids:
        leads_list = await db.leads.find({"_id": {"$in": [ObjectId(lid) for lid in lead_ids]}}).to_list(1000)
        leads_dict = {str(ld["_id"]): ld for ld in leads_list}

    debit_deals, cash_deals = [], []
    for d in deals:
        lead = leads_dict.get(d["lead_id"], {})
        deal_info = {
            "id": str(d["_id"]),
            "deal_date": d["deal_date"],
            "client_name": f"{lead.get('name', 'Unknown')} {lead.get('surname', '')}".strip(),
            "client_number": lead.get("phone", ""),
            "payment_type": d["payment_type"],
            "sales_value": d.get("sales_value"),
            "joining_fee": d.get("joining_fee"),
            "debit_order_value": d.get("debit_order_value"),
            "units": d.get("units", 0) or 0,
            "term": d.get("term")
        }
        if d["payment_type"] == "Debit Order":
            debit_deals.append(deal_info)
        elif d["payment_type"] == "Cash":
            cash_deals.append(deal_info)
    return debit_deals, cash_deals

def _calculate_bonuses(earnings):
    """Calculate total bonuses from earnings scale."""
    bonuses = earnings.get("bonuses", {})
    club_incentive = bonuses.get("club_incentive", 0) or 0
    special_bonus = bonuses.get("special_bonus", 0) or 0
    extra_incentives = bonuses.get("incentives", [])
    total_incentives = sum((inc.get("value", 0) or 0) for inc in extra_incentives)
    return {
        "club_incentive": club_incentive,
        "special_bonus": special_bonus,
        "incentives": extra_incentives,
        "total": club_incentive + special_bonus + total_incentives
    }

def _find_applicable_rate(total_amount, tiers, amount_key="min_units", rate_key="rate"):
    """Find the applicable tier rate for a given amount."""
    rate = 0
    for tier in sorted(tiers, key=lambda t: t.get(amount_key, 0)):
        if total_amount >= tier.get(amount_key, 0):
            rate = tier.get(rate_key, 0)
    return rate

@api_router.get("/commission")
async def get_commission(
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    target_user = await _resolve_commission_target(user_id, current_user)
    target_id = str(target_user["_id"])
    earnings = target_user.get("earnings_scale", {})

    settings = await db.settings.find_one({"key": "system_settings"})
    month_start = settings.get("month_start_date") if settings else None
    month_end = settings.get("month_end_date") if settings else None

    debit_deals, cash_deals = await _get_commission_deals(target_id, month_start, month_end)

    total_debit_units = sum(d["units"] for d in debit_deals)
    total_cash_value = sum((d["sales_value"] or 0) for d in cash_deals)
    total_joining_fees = sum((d.get("joining_fee") or 0) for d in debit_deals)
    total_debit_value = sum((d.get("debit_order_value") or 0) for d in debit_deals)

    debit_tiers = earnings.get("debit_order_tiers", [])
    cash_tiers = earnings.get("cash_sales_tiers", [])
    basic_salary = earnings.get("basic_salary", 0) or 0

    debit_commission = calculate_debit_commission(total_debit_units, debit_tiers)
    cash_commission = calculate_cash_commission(total_cash_value, cash_tiers)
    bonuses = _calculate_bonuses(earnings)

    earnings_mtd = basic_salary + debit_commission + cash_commission + bonuses["total"]

    goal_doc = await db.commission_goals.find_one({"user_id": target_id, "period_start": month_start})
    income_goal = goal_doc["goal"] if goal_doc else 0

    debit_rate = _find_applicable_rate(total_debit_units, debit_tiers, "min_units", "rate")
    cash_pct = _find_applicable_rate(total_cash_value, cash_tiers, "min_value", "percentage")

    return {
        "consultant_name": target_user["name"],
        "consultant_id": target_id,
        "month_start": month_start,
        "month_end": month_end,
        "basic_salary": basic_salary,
        "debit_commission": round(debit_commission, 2),
        "cash_commission": round(cash_commission, 2),
        "total_bonuses": round(bonuses["total"], 2),
        "bonuses_detail": {
            "club_incentive": bonuses["club_incentive"],
            "special_bonus": bonuses["special_bonus"],
            "incentives": bonuses["incentives"]
        },
        "earnings_mtd": round(earnings_mtd, 2),
        "income_goal": income_goal,
        "debit_deals": debit_deals,
        "cash_deals": cash_deals,
        "total_debit_units": total_debit_units,
        "total_cash_value": round(total_cash_value, 2),
        "total_joining_fees": round(total_joining_fees, 2),
        "total_debit_value": round(total_debit_value, 2),
        "debit_rate": debit_rate,
        "cash_pct": cash_pct,
        "earnings_scale": earnings
    }

@api_router.put("/commission/goal")
async def set_commission_goal(
    data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    user_id = data.get("user_id", str(current_user["_id"]))
    goal = data.get("goal", 0)

    settings = await db.settings.find_one({"key": "system_settings"})
    period_start = settings.get("month_start_date") if settings else None

    await db.commission_goals.update_one(
        {"user_id": user_id, "period_start": period_start},
        {"$set": {"user_id": user_id, "period_start": period_start, "goal": goal}},
        upsert=True
    )
    return {"success": True}

@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        settings = await db.settings.find_one({"key": "system_settings"}, {"month_start_date": 1, "month_end_date": 1, "_id": 0})
        return settings if settings else {"month_start_date": None, "month_end_date": None}
    
    settings = await db.settings.find_one({"key": "system_settings"})
    
    if not settings:
        default_settings = {
            "key": "system_settings",
            "auto_followup_hours": 12,
            "auto_reassign_hours": 72,
            "whatsapp_template": "Hi {name}, thank you for your interest in Revival Fitness! I'm {consultant} and I'll be helping you today. When would be a good time for you to visit our gym?",
            "logo_url": "https://images.pexels.com/photos/7151700/pexels-photo-7151700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "month_start_date": None,
            "month_end_date": None
        }
        await db.settings.insert_one(default_settings)
        return default_settings
    
    # Exclude MongoDB _id from response
    settings.pop("_id", None)
    return settings

@api_router.put("/settings")
async def update_settings(settings_update: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update settings")
    
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    
    await db.settings.update_one(
        {"key": "system_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True}

@api_router.post("/appointments")
async def create_appointment(appointment: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    appointment_doc = {
        "lead_id": appointment.lead_id,
        "scheduled_at": appointment.scheduled_at,
        "notes": appointment.notes,
        "booked_by": appointment.booked_by or str(current_user["_id"]),
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reminder_24h_sent": False,
        "reminder_2h_sent": False
    }
    
    result = await db.appointments.insert_one(appointment_doc)
    
    await db.leads.update_one(
        {"_id": ObjectId(appointment.lead_id)},
        {"$set": {"stage": LeadStage.APPOINTMENT_SET}}
    )
    
    # Log activity for timeline
    sched_display = appointment.scheduled_at.replace("T", " at ")[:16]
    await db.activities.insert_one({
        "lead_id": appointment.lead_id,
        "user_id": str(current_user["_id"]),
        "activity_type": "appointment_booked",
        "content": f"Appointment booked for {sched_display}",
        "notes": appointment.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Notify lead owner: New Appointment Booked
    lead = await db.leads.find_one({"_id": ObjectId(appointment.lead_id)})
    if lead and lead.get("owner_id"):
        sched_time = appointment.scheduled_at.replace("T", " at ")[:16]
        await create_notification(
            lead["owner_id"],
            "appointment_booked",
            "New Appointment Booked",
            f"Appointment for {lead['name']} on {sched_time}.",
            appointment.lead_id
        )
    
    return {"success": True, "appointment_id": str(result.inserted_id)}

@api_router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if date:
        query["scheduled_at"] = {"$regex": f"^{date}"}
    
    if current_user["role"] == UserRole.CONSULTANT:
        my_id = str(current_user["_id"])
        # Get leads owned by this consultant
        my_lead_ids = await db.leads.find(
            {"owner_id": my_id},
            {"_id": 1}
        ).to_list(1000)
        lead_id_strs = [str(lead["_id"]) for lead in my_lead_ids]
        
        # Also include appointments booked by linked assistants
        linked_assistants = await db.users.find({
            "role": UserRole.ASSISTANT,
            "linked_consultants": my_id,
            "active": True
        }).to_list(100)
        assistant_ids = [str(a["_id"]) for a in linked_assistants]
        
        if assistant_ids:
            # Find leads created by assistants for this consultant
            assistant_lead_ids = await db.leads.find(
                {"created_by": {"$in": assistant_ids}},
                {"_id": 1}
            ).to_list(1000)
            lead_id_strs.extend([str(l["_id"]) for l in assistant_lead_ids])
            lead_id_strs = list(set(lead_id_strs))
        
        query["lead_id"] = {"$in": lead_id_strs}
    elif current_user["role"] == UserRole.ASSISTANT:
        linked = current_user.get("linked_consultants", [])
        lead_ids = await db.leads.find(
            {"owner_id": {"$in": linked}},
            {"_id": 1}
        ).to_list(1000)
        lead_id_strs = [str(lead["_id"]) for lead in lead_ids]
        query["$or"] = [
            {"lead_id": {"$in": lead_id_strs}},
            {"booked_by": str(current_user["_id"])}
        ]
    
    appointments = await db.appointments.find(query).sort("scheduled_at", 1).to_list(1000)
    
    lead_ids = [apt["lead_id"] for apt in appointments]
    leads_dict = {}
    if lead_ids:
        leads = await db.leads.find({"_id": {"$in": [ObjectId(lid) for lid in lead_ids]}}).to_list(1000)
        leads_dict = {str(lead["_id"]): lead for lead in leads}
    
    booked_by_ids = list(set([apt.get("booked_by") for apt in appointments if apt.get("booked_by")]))
    owner_ids = list(set([leads_dict.get(apt["lead_id"], {}).get("owner_id") for apt in appointments if leads_dict.get(apt["lead_id"], {}).get("owner_id")]))
    all_user_ids = list(set(booked_by_ids + owner_ids))
    
    users_dict = {}
    if all_user_ids:
        users = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in all_user_ids]}}).to_list(1000)
        users_dict = {str(user["_id"]): user["name"] for user in users}
    
    return [
        {
            "id": str(apt["_id"]),
            "lead_id": apt["lead_id"],
            "lead_name": leads_dict.get(apt["lead_id"], {}).get("name", "Unknown"),
            "lead_surname": leads_dict.get(apt["lead_id"], {}).get("surname"),
            "lead_phone": leads_dict.get(apt["lead_id"], {}).get("phone"),
            "consultant_name": users_dict.get(leads_dict.get(apt["lead_id"], {}).get("owner_id")),
            "booked_by_name": users_dict.get(apt.get("booked_by")),
            "scheduled_at": apt["scheduled_at"],
            "notes": apt.get("notes"),
            "reminder_24h_sent": apt.get("reminder_24h_sent", False),
            "reminder_2h_sent": apt.get("reminder_2h_sent", False),
            "created_at": apt["created_at"]
        }
        for apt in appointments
    ]

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    await db.appointments.update_one(
        {"_id": validate_object_id(appointment_id, "appointment")},
        {"$set": updates}
    )
    return {"success": True}

@api_router.get("/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.audit_logs.find({}).sort("timestamp", -1).limit(100).to_list(100)
    
    return [
        {
            "id": str(log["_id"]),
            "action": log["action"],
            "lead_id": log.get("lead_id"),
            "user_id": log["user_id"],
            "timestamp": log["timestamp"],
            "details": log.get("details", {})
        }
        for log in logs
    ]

@api_router.post("/whatsapp/send")
async def send_whatsapp(message: WhatsAppMessageRequest, current_user: dict = Depends(get_current_user)):
    # Determine which WhatsApp session to use:
    # If sending on behalf of a lead, use the lead owner's (consultant's) session
    # Otherwise fall back to the current user's session
    user_id = str(current_user["_id"])
    
    lead = None
    if message.lead_id:
        lead = await db.leads.find_one({"_id": ObjectId(message.lead_id)})
        if lead and lead.get("owner_id"):
            # Use the consultant's WhatsApp session (the lead's owner)
            user_id = lead["owner_id"]
    
    # Replace template variables
    message_text = message.message
    if lead:
        message_text = message_text.replace("{client_name}", lead.get("name", ""))
        message_text = message_text.replace("{phone}", lead.get("phone", ""))
    
    message_text = message_text.replace("{consultant_name}", current_user["name"])
    
    # Send via WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/send-message", json={
                "userId": user_id,
                "phoneNumber": message.phone_number,
                "message": message_text
            })
            result = response.json()
    except Exception as e:
        logger.error(f"WhatsApp service error: {e}")
        result = {"success": False, "message": str(e)}
    
    # Log message
    await db.message_logs.insert_one({
        "phone_number": message.phone_number,
        "message": message_text,
        "lead_id": message.lead_id,
        "sent_by": user_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent" if result.get("success") else "failed",
        "error": result.get("message") if not result.get("success") else None
    })
    
    if result.get("success"):
        # Check if the message contains .appointment trigger (CRM-sent messages)
        if message_text.strip().lower().startswith('.appointment'):
            try:
                # Get lead's phone number for matching
                lead_phone = message.phone_number
                await process_appointment_trigger(user_id, lead_phone, message_text)
            except Exception as e:
                logger.error(f"Auto-appointment from CRM send failed: {e}")
        
        return {"success": True, "message": "Message sent successfully"}
    else:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to send message"))

# ==========================================
# Auto-Appointment from WhatsApp Trigger
# ==========================================

import re as regex_module

def parse_appointment_message(text: str):
    """Parse .appointment trigger message into structured data."""
    lines = text.strip().split('\n')
    data = {
        'client_name': None,
        'date': None,
        'time': None,
        'appointment_type': 'consultation'
    }
    
    # First line: ".appointment set for Client Name" or ".appointment Client Name"
    first_line = lines[0].strip()
    # Extract client name from first line
    name_match = regex_module.search(r'\.appointment\s+(?:set\s+for\s+)?(.+)', first_line, regex_module.IGNORECASE)
    if name_match:
        data['client_name'] = name_match.group(1).strip()
    
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        
        # Date: 2026-04-05 or Date: 5 April 2026 etc.
        date_match = regex_module.match(r'date\s*:\s*(.+)', line, regex_module.IGNORECASE)
        if date_match:
            date_str = date_match.group(1).strip()
            # Try parsing various date formats
            for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%d %B %Y', '%d %b %Y', '%B %d %Y', '%b %d %Y']:
                try:
                    parsed = datetime.strptime(date_str, fmt)
                    data['date'] = parsed.strftime('%Y-%m-%d')
                    break
                except ValueError:
                    continue
            if not data['date']:
                data['date'] = date_str
        
        # Time: 10:00 or Time: 10am etc.
        time_match = regex_module.match(r'time\s*:\s*(.+)', line, regex_module.IGNORECASE)
        if time_match:
            time_str = time_match.group(1).strip()
            # Handle 10:00, 10am, 2pm, 14:30 etc.
            t_match = regex_module.match(r'(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?', time_str, regex_module.IGNORECASE)
            if t_match:
                hour = int(t_match.group(1))
                minute = int(t_match.group(2) or 0)
                ampm = (t_match.group(3) or '').lower()
                if ampm == 'pm' and hour < 12:
                    hour += 12
                elif ampm == 'am' and hour == 12:
                    hour = 0
                data['time'] = f'{hour:02d}:{minute:02d}'
            else:
                data['time'] = time_str
        
        # For: Tour/Consultation/Free Trial
        for_match = regex_module.match(r'for\s*:\s*(.+)', line, regex_module.IGNORECASE)
        if for_match:
            apt_type = for_match.group(1).strip().lower()
            type_map = {
                'tour': 'tour',
                'gym tour': 'tour',
                'consultation': 'consultation',
                'consult': 'consultation',
                'free trial': 'trial',
                'trial': 'trial',
                'follow up': 'follow_up',
                'follow-up': 'follow_up',
                'followup': 'follow_up'
            }
            data['appointment_type'] = type_map.get(apt_type, 'general')
    
    return data

async def process_appointment_trigger(consultant_user_id: str, chat_phone: str, message_text: str):
    """Process .appointment trigger: match lead, create appointment, schedule confirmation."""
    parsed = parse_appointment_message(message_text)
    
    if not parsed['date'] or not parsed['time']:
        logger.warning(f"Auto-appointment parse failed - missing date/time: {parsed}")
        return
    
    # Clean up the phone number for matching
    clean_phone = chat_phone.replace('+', '').replace(' ', '').replace('-', '')
    # Also create the local format (for SA: 27xxx -> 0xxx)
    local_phone = clean_phone
    if clean_phone.startswith('27') and len(clean_phone) > 9:
        local_phone = '0' + clean_phone[2:]
    
    # Try to find the lead by phone number first
    lead = await db.leads.find_one({
        "$or": [
            {"phone": {"$regex": clean_phone[-9:]}},  # Match last 9 digits
            {"phone": local_phone},
            {"phone": clean_phone},
            {"phone": "+" + clean_phone}
        ]
    })
    
    # Also try matching by client name if provided and lead not found
    if not lead and parsed['client_name']:
        name_parts = parsed['client_name'].split()
        if len(name_parts) >= 1:
            lead = await db.leads.find_one({
                "name": {"$regex": name_parts[0], "$options": "i"}
            })
    
    # If still no lead, create one
    if not lead:
        lead_doc = {
            "name": f"WA - {parsed['client_name']}" if parsed['client_name'] else "WA - Appointment",
            "surname": None,
            "email": None,
            "phone": local_phone or chat_phone,
            "source": "WhatsApp",
            "campaign": None,
            "stage": LeadStage.APPOINTMENT_SET,
            "owner_id": consultant_user_id,
            "tags": ["auto-appointment"],
            "notes": f"Auto-created from WhatsApp .appointment trigger",
            "form_answers": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_contact": datetime.now(timezone.utc).isoformat()
        }
        result = await db.leads.insert_one(lead_doc)
        lead = lead_doc
        lead["_id"] = result.inserted_id
        logger.info(f"Auto-created lead for appointment: {parsed['client_name']}")
    else:
        # Update stage to Appointment Set
        await db.leads.update_one(
            {"_id": lead["_id"]},
            {"$set": {"stage": LeadStage.APPOINTMENT_SET, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    lead_id = str(lead["_id"])
    scheduled_at = f"{parsed['date']}T{parsed['time']}:00"
    
    # Create the appointment
    appointment_doc = {
        "lead_id": lead_id,
        "scheduled_at": scheduled_at,
        "notes": f"Auto-booked via WhatsApp | Type: {parsed['appointment_type']}",
        "appointment_type": parsed['appointment_type'],
        "booked_by": consultant_user_id,
        "created_by": consultant_user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reminder_24h_sent": False,
        "reminder_2h_sent": False,
        "auto_created": True
    }
    apt_result = await db.appointments.insert_one(appointment_doc)
    
    # Log the activity
    await db.activities.insert_one({
        "lead_id": lead_id,
        "user_id": consultant_user_id,
        "activity_type": "appointment_auto_created",
        "content": f"Appointment auto-scheduled via WhatsApp: {parsed['appointment_type']} on {parsed['date']} at {parsed['time']}",
        "notes": message_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Schedule 30-minute delayed confirmation via WhatsApp
    consultant = await db.users.find_one({"_id": ObjectId(consultant_user_id)})
    consultant_name = consultant["name"] if consultant else "Your consultant"
    client_name = lead.get("name", parsed.get("client_name", ""))
    
    type_labels = {
        'tour': 'Gym Tour',
        'consultation': 'Consultation', 
        'trial': 'Free Trial',
        'follow_up': 'Follow-up',
        'general': 'Appointment'
    }
    type_label = type_labels.get(parsed['appointment_type'], 'Appointment')
    
    confirmation_msg = (
        f"Hi {client_name}, your {type_label} has been confirmed!\n\n"
        f"Date: {parsed['date']}\n"
        f"Time: {parsed['time']}\n"
        f"With: {consultant_name}\n\n"
        f"We look forward to seeing you! Reply to this message if you need to reschedule."
    )
    
    # Send delayed confirmation (30 minutes = 1800000 ms)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{WHATSAPP_SERVICE_URL}/send-delayed-confirmation", json={
                "userId": consultant_user_id,
                "phoneNumber": chat_phone,
                "message": confirmation_msg,
                "delayMs": 30 * 60 * 1000  # 30 minutes
            })
        logger.info(f"Confirmation scheduled for {client_name} at {chat_phone} in 30 minutes")
    except Exception as e:
        logger.error(f"Failed to schedule confirmation: {e}")
    
    logger.info(f"Auto-appointment created: {client_name} - {parsed['appointment_type']} on {parsed['date']} {parsed['time']}")
    
    # Notify consultant: WhatsApp Auto-Appointment Created
    await create_notification(
        consultant_user_id,
        "auto_appointment",
        "Auto-Appointment Created",
        f"Appointment for {client_name} — {type_label} on {parsed['date']} at {parsed['time']} (via WhatsApp trigger).",
        lead_id
    )
    
    return str(apt_result.inserted_id)

class AutoAppointmentRequest(BaseModel):
    user_id: str
    chat_phone: str
    message_text: str
    from_me: bool = False

class WhatsAppPasswordResetRequest(BaseModel):
    user_id: str
    chat_phone: str

@api_router.post("/whatsapp/password-reset")
async def whatsapp_password_reset(req: WhatsAppPasswordResetRequest):
    """Called by WhatsApp service when .XACPASS trigger detected. Returns the user's password placeholder."""
    # Find user by phone number (the chat they're messaging from)
    clean_phone = req.chat_phone.replace('+', '').replace(' ', '')
    local_phone = clean_phone
    if clean_phone.startswith('27') and len(clean_phone) > 9:
        local_phone = '0' + clean_phone[2:]
    
    user = await db.users.find_one({
        "$or": [
            {"phone": {"$regex": clean_phone[-9:]}},
            {"phone": local_phone},
            {"phone": clean_phone},
            {"phone": "+" + clean_phone}
        ]
    })
    
    if not user:
        return {"success": False, "message": "No account found for this number"}
    
    # We can't retrieve hashed passwords, so reset to a temp password and return it
    import secrets
    temp_password = f"XAC{secrets.token_hex(3).upper()}"
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": pwd_context.hash(temp_password)}}
    )
    
    logger.info(f"Password reset via .XACPASS for {user['name']} ({user['email']})")
    
    return {"success": True, "password": temp_password, "email": user["email"]}

@api_router.post("/whatsapp/auto-appointment")
async def whatsapp_auto_appointment(req: AutoAppointmentRequest):
    """Called by WhatsApp Node service when .appointment trigger is detected in a chat."""
    try:
        result = await process_appointment_trigger(req.user_id, req.chat_phone, req.message_text)
        return {"success": True, "appointment_id": result}
    except Exception as e:
        logger.error(f"Auto-appointment endpoint error: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/whatsapp/status")
async def whatsapp_status(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status/{user_id}")
            status = response.json()
            return status
    except Exception as e:
        logger.error(f"WhatsApp status check error: {e}")
        return {"connected": False, "hasQR": False}

@api_router.get("/whatsapp/status/{user_id}")
async def whatsapp_status_by_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status/{user_id}")
            status = response.json()
            return status
    except Exception as e:
        logger.error(f"WhatsApp status check error: {e}")
        return {"connected": False, "hasQR": False}

@api_router.post("/whatsapp/start-session")
async def start_whatsapp_session(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can start WhatsApp sessions")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/start-session", json={
                "userId": user_id
            })
            result = response.json()
            return result
    except Exception as e:
        logger.error(f"WhatsApp session start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/qr/{user_id}")
async def get_whatsapp_qr(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view QR codes")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr/{user_id}")
            if response.status_code == 200:
                return response.json()
            else:
                return {"qrCode": None}
    except Exception as e:
        logger.error(f"WhatsApp QR fetch error: {e}")
        return {"qrCode": None}

@api_router.post("/whatsapp/logout")
async def logout_whatsapp(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can logout WhatsApp sessions")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/logout", json={
                "userId": user_id
            })
            result = response.json()
            return result
    except Exception as e:
        logger.error(f"WhatsApp logout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can disconnect WhatsApp sessions")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/disconnect/{user_id}")
            result = response.json()
            return result
    except Exception as e:
        logger.error(f"WhatsApp disconnect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/end-session")
async def end_whatsapp_session(user_id: str, current_user: dict = Depends(get_current_user)):
    """End session completely - clears all auth data for a fresh start."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can end WhatsApp sessions")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/logout", json={"userId": user_id})
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp end session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/whatsapp/status-all")
async def get_all_whatsapp_status(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view all statuses")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status-all")
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp status-all error: {e}")
        return {}

@api_router.post("/message-templates")
async def create_message_template(template: MessageTemplateCreate, current_user: dict = Depends(get_current_user)):
    template_doc = {
        "name": template.name,
        "content": template.content,
        "user_id": template.user_id or str(current_user["_id"]),
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.message_templates.insert_one(template_doc)
    return {"success": True, "template_id": str(result.inserted_id)}

@api_router.get("/message-templates")
async def get_message_templates(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.ADMIN:
        templates = await db.message_templates.find({}).to_list(1000)
    else:
        templates = await db.message_templates.find({"user_id": str(current_user["_id"])}).to_list(1000)
    
    user_ids = list(set([t["user_id"] for t in templates]))
    users_dict = {}
    if user_ids:
        users = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(1000)
        users_dict = {str(u["_id"]): u["name"] for u in users}
    
    return [
        {
            "id": str(t["_id"]),
            "name": t["name"],
            "content": t["content"],
            "user_id": t["user_id"],
            "user_name": users_dict.get(t["user_id"]),
            "created_at": t["created_at"]
        }
        for t in templates
    ]

@api_router.put("/message-templates/{template_id}")
async def update_message_template(
    template_id: str,
    template_update: MessageTemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in template_update.model_dump().items() if v is not None}
    
    await db.message_templates.update_one(
        {"_id": validate_object_id(template_id, "template")},
        {"$set": update_data}
    )
    
    return {"success": True}

@api_router.delete("/message-templates/{template_id}")
async def delete_message_template(template_id: str, current_user: dict = Depends(get_current_user)):
    await db.message_templates.delete_one({"_id": validate_object_id(template_id, "template")})
    return {"success": True}

@api_router.put("/leads/{lead_id}/score")
async def update_lead_score(lead_id: str, score: int, current_user: dict = Depends(get_current_user)):
    await db.leads.update_one(
        {"_id": validate_object_id(lead_id, "lead")},
        {"$set": {"score": score, "scored_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@api_router.get("/reports/export")
async def export_report(
    report_type: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    data = []
    
    if report_type == "leads":
        query = {}
        if from_date and to_date:
            query["created_at"] = {"$gte": from_date, "$lte": to_date}
        
        leads = await db.leads.find(query).to_list(10000)
        
        owner_ids = list(set([lead.get("owner_id") for lead in leads if lead.get("owner_id")]))
        users_dict = {}
        if owner_ids:
            users = await db.users.find({"_id": {"$in": [ObjectId(oid) for oid in owner_ids]}}).to_list(1000)
            users_dict = {str(u["_id"]): u["name"] for u in users}
        
        data = [
            {
                "Name": lead["name"],
                "Surname": lead.get("surname", ""),
                "Email": lead.get("email", ""),
                "Phone": lead["phone"],
                "Source": lead["source"],
                "Stage": lead["stage"],
                "Owner": users_dict.get(lead.get("owner_id"), ""),
                "Created At": lead.get("created_at", ""),
                "Score": lead.get("score", 0)
            }
            for lead in leads
        ]
    
    elif report_type == "deals":
        query = {}
        if from_date and to_date:
            query["deal_date"] = {"$gte": from_date, "$lte": to_date}
        
        deals = await db.deals.find(query).to_list(10000)
        
        lead_ids = [d["lead_id"] for d in deals]
        leads_dict = {}
        if lead_ids:
            leads = await db.leads.find({"_id": {"$in": [ObjectId(lid) for lid in lead_ids]}}).to_list(10000)
            leads_dict = {str(l["_id"]): l for l in leads}
        
        data = [
            {
                "Lead Name": leads_dict.get(deal["lead_id"], {}).get("name", ""),
                "Deal Date": deal["deal_date"],
                "Payment Type": deal["payment_type"],
                "Sales Value": deal.get("sales_value", 0),
                "Debit Order Value": deal.get("debit_order_value", 0),
                "Units": deal.get("units", 0),
                "Joining Fee": deal.get("joining_fee", 0),
                "Term": deal.get("term", 0),
                "Stage": leads_dict.get(deal["lead_id"], {}).get("stage", "")
            }
            for deal in deals
        ]
    
    elif report_type == "appointments":
        query = {}
        if from_date and to_date:
            query["scheduled_at"] = {"$gte": from_date, "$lte": to_date}
        
        appointments = await db.appointments.find(query).to_list(10000)
        
        lead_ids = [apt["lead_id"] for apt in appointments]
        leads_dict = {}
        if lead_ids:
            leads = await db.leads.find({"_id": {"$in": [ObjectId(lid) for lid in lead_ids]}}).to_list(10000)
            leads_dict = {str(l["_id"]): l for l in leads}
        
        data = [
            {
                "Lead Name": leads_dict.get(apt["lead_id"], {}).get("name", ""),
                "Scheduled At": apt["scheduled_at"],
                "Notes": apt.get("notes", ""),
                "Created At": apt["created_at"]
            }
            for apt in appointments
        ]
    
    return {"data": data, "count": len(data)}

@api_router.get("/analytics/consultant-performance")
async def get_consultant_performance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    consultants = await db.users.find({"role": UserRole.CONSULTANT}).to_list(1000)
    
    performance = []
    for consultant in consultants:
        consultant_id = str(consultant["_id"])
        
        total_leads = await db.leads.count_documents({"owner_id": consultant_id})
        closed_won = await db.leads.count_documents({"owner_id": consultant_id, "stage": LeadStage.CLOSED_WON})
        
        deals = await db.deals.find({"closed_by": consultant_id}).to_list(1000)
        
        invalid_leads = await db.leads.find({"owner_id": consultant_id, "stage": LeadStage.INVALID}).to_list(1000)
        invalid_lead_ids = [str(lead["_id"]) for lead in invalid_leads]
        
        total_sales = sum(
            d.get("sales_value", 0) or 0 
            for d in deals 
            if d["payment_type"] == "Cash" and d["lead_id"] not in invalid_lead_ids
        )
        total_debit = sum(
            d.get("debit_order_value", 0) or 0 
            for d in deals 
            if d["payment_type"] == "Debit Order" and d["lead_id"] not in invalid_lead_ids
        )
        
        avg_response_time = 0
        activities = await db.activities.find({"user_id": consultant_id}).limit(100).to_list(100)
        if activities:
            response_times = []
            for activity in activities:
                lead = await db.leads.find_one({"_id": ObjectId(activity["lead_id"])})
                if lead:
                    created = datetime.fromisoformat(lead["created_at"].replace('Z', '+00:00'))
                    contacted = datetime.fromisoformat(activity["created_at"].replace('Z', '+00:00'))
                    diff = (contacted - created).total_seconds() / 3600
                    if diff > 0 and diff < 168:
                        response_times.append(diff)
            
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
        
        performance.append({
            "consultant_id": consultant_id,
            "consultant_name": consultant["name"],
            "total_leads": total_leads,
            "closed_won": closed_won,
            "conversion_rate": round((closed_won / total_leads * 100) if total_leads > 0 else 0, 2),
            "total_cash_sales": round(total_sales, 2),
            "total_debit_sales": round(total_debit, 2),
            "avg_response_time_hours": round(avg_response_time, 2)
        })
    
    return performance

class GenerateReportRequest(BaseModel):
    mode: str = "mtd_only"  # "mtd_only" or "start_new_month"

@api_router.post("/reports/generate-month-report")
async def generate_month_report(report_req: GenerateReportRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can generate month reports")
    
    settings = await db.settings.find_one({"key": "system_settings"})
    if not settings or not settings.get("month_start_date") or not settings.get("month_end_date"):
        raise HTTPException(status_code=400, detail="Month period not configured")
    
    month_start = settings["month_start_date"]
    month_end = settings["month_end_date"]
    
    closed_won_leads = await db.leads.find({"stage": LeadStage.CLOSED_WON}).to_list(10000)
    
    if not closed_won_leads:
        return {"message": "No closed deals to process", "deals_count": 0}
    
    lead_ids = [str(lead["_id"]) for lead in closed_won_leads]
    deals = await db.deals.find({"lead_id": {"$in": lead_ids}}).to_list(10000)
    
    owner_ids = list(set([lead.get("owner_id") for lead in closed_won_leads if lead.get("owner_id")]))
    users_dict = {}
    if owner_ids:
        users = await db.users.find({"_id": {"$in": [ObjectId(oid) for oid in owner_ids]}}).to_list(1000)
        users_dict = {str(u["_id"]): u["name"] for u in users}
    
    report_data = []
    for lead in closed_won_leads:
        lead_deals = [d for d in deals if d["lead_id"] == str(lead["_id"])]
        for deal in lead_deals:
            report_data.append({
                "lead_id": str(lead["_id"]),
                "lead_name": lead["name"],
                "lead_surname": lead.get("surname"),
                "owner_name": users_dict.get(lead.get("owner_id")),
                "deal_date": deal["deal_date"],
                "payment_type": deal["payment_type"],
                "sales_value": deal.get("sales_value"),
                "debit_order_value": deal.get("debit_order_value"),
                "units": deal.get("units"),
                "joining_fee": deal.get("joining_fee"),
                "closed_by": deal["closed_by"],
                "to_by": deal["to_by"]
            })
    
    report_doc = {
        "name": f"Report {month_start} to {month_end}",
        "period_start": month_start,
        "period_end": month_end,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": str(current_user["_id"]),
        "deals": report_data,
        "total_deals": len(report_data),
        "total_cash_sales": sum(d.get("sales_value", 0) or 0 for d in deals if d["payment_type"] == "Cash"),
        "total_debit_sales": sum(d.get("debit_order_value", 0) or 0 for d in deals if d["payment_type"] == "Debit Order"),
        "total_units": sum(d.get("units", 0) or 0 for d in deals),
        "mode": report_req.mode
    }
    
    await db.month_reports.insert_one(report_doc)
    
    message = "MTD report generated"
    
    if report_req.mode == "start_new_month":
        # Archive Closed Won leads
        await db.leads.update_many(
            {"stage": LeadStage.CLOSED_WON},
            {"$set": {"stage": "Archived"}}
        )
        # Clear all deals for the period (reset sales totals)
        await db.deals.delete_many({"lead_id": {"$in": lead_ids}})
        # Reset commission goals for all consultants
        await db.commission_goals.delete_many({"period_start": month_start})
        message = "New month started. Deals archived, sales totals reset."
    
    return {
        "success": True,
        "message": message,
        "deals_count": len(report_data),
        "period": f"{month_start} to {month_end}",
        "mode": report_req.mode
    }

@api_router.get("/reports/month-reports")
async def get_month_reports(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    reports = await db.month_reports.find({}).sort("generated_at", -1).to_list(1000)
    
    return [
        {
            "id": str(report["_id"]),
            "name": report.get("name", f"Report {report['period_start']} to {report['period_end']}"),
            "period_start": report["period_start"],
            "period_end": report["period_end"],
            "generated_at": report["generated_at"],
            "total_deals": report["total_deals"],
            "total_cash_sales": report["total_cash_sales"],
            "total_debit_sales": report["total_debit_sales"],
            "total_units": report["total_units"]
        }
        for report in reports
    ]

@api_router.get("/reports/month-reports/{report_id}")
async def get_month_report_details(report_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    report = await db.month_reports.find_one({"_id": validate_object_id(report_id, "report")})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "id": str(report["_id"]),
        "name": report.get("name", ""),
        "period_start": report["period_start"],
        "period_end": report["period_end"],
        "generated_at": report["generated_at"],
        "deals": report["deals"],
        "total_deals": report["total_deals"],
        "total_cash_sales": report["total_cash_sales"],
        "total_debit_sales": report["total_debit_sales"],
        "total_units": report["total_units"]
    }

@api_router.put("/reports/month-reports/{report_id}")
async def update_month_report(report_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    report = await db.month_reports.find_one({"_id": validate_object_id(report_id, "report")})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    updates = {}
    if "name" in data:
        updates["name"] = data["name"]
    if updates:
        await db.month_reports.update_one({"_id": validate_object_id(report_id, "report")}, {"$set": updates})
    return {"success": True}

@api_router.delete("/reports/month-reports/{report_id}")
async def delete_month_report(report_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.month_reports.delete_one({"_id": validate_object_id(report_id, "report")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}

@api_router.get("/reports/month-reports/{report_id}/pdf")
async def download_month_report_pdf(report_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    report = await db.month_reports.find_one({"_id": validate_object_id(report_id, "report")})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report_name = report.get("name", "Report")
    period = f"{report['period_start']} to {report['period_end']}"
    
    # Build HTML for PDF
    deals_rows = ""
    for d in report.get("deals", []):
        deals_rows += f"""<tr>
            <td style="padding:8px;border-bottom:1px solid #333;">{d.get('lead_name','')}</td>
            <td style="padding:8px;border-bottom:1px solid #333;">{d.get('payment_type','')}</td>
            <td style="padding:8px;border-bottom:1px solid #333;">R{d.get('sales_value','') or d.get('debit_order_value','') or 0}</td>
            <td style="padding:8px;border-bottom:1px solid #333;">{d.get('units','') or '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #333;">{d.get('closed_by_name','')}</td>
        </tr>"""
    
    html = f"""<html><head><style>
        body {{ font-family: Arial, sans-serif; color: #fff; background: #0a0a0a; padding: 40px; }}
        h1 {{ color: #bef264; margin-bottom: 4px; }}
        h2 {{ color: #a1a1aa; font-size: 14px; font-weight: normal; }}
        .stats {{ display: flex; gap: 24px; margin: 24px 0; }}
        .stat {{ background: #18181b; padding: 16px 24px; border-radius: 8px; border: 1px solid #27272a; }}
        .stat-label {{ font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; }}
        .stat-value {{ font-size: 28px; font-weight: 900; margin-top: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
        th {{ text-align: left; padding: 10px 8px; border-bottom: 2px solid #bef264; color: #bef264; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
        td {{ color: #d4d4d8; font-size: 13px; }}
        .footer {{ margin-top: 32px; font-size: 11px; color: #52525b; text-align: center; }}
    </style></head><body>
        <h1>{report_name}</h1>
        <h2>{period} &nbsp;|&nbsp; Generated: {report.get('generated_at','')[:10]}</h2>
        <div class="stats">
            <div class="stat"><div class="stat-label">Total Deals</div><div class="stat-value" style="color:#bef264;">{report['total_deals']}</div></div>
            <div class="stat"><div class="stat-label">Cash Sales</div><div class="stat-value" style="color:#34d399;">R{report['total_cash_sales']}</div></div>
            <div class="stat"><div class="stat-label">Debit Sales</div><div class="stat-value" style="color:#22d3ee;">R{report['total_debit_sales']}</div></div>
            <div class="stat"><div class="stat-label">Total Units</div><div class="stat-value" style="color:#fbbf24;">{report['total_units']}</div></div>
        </div>
        <table>
            <thead><tr><th>Lead</th><th>Type</th><th>Value</th><th>Units</th><th>Closed By</th></tr></thead>
            <tbody>{deals_rows if deals_rows else '<tr><td colspan="5" style="padding:16px;text-align:center;color:#52525b;">No deals in this report</td></tr>'}</tbody>
        </table>
        <div class="footer">XAC CRM — Revival Fitness | {period}</div>
    </body></html>"""
    
    from fastapi.responses import Response
    # Return HTML that the frontend will convert to PDF via browser print
    return Response(content=html, media_type="text/html")

# ==========================================
# MARKETING: Forms, Gallery, Webhooks
# ==========================================

MARKETING_ROLES = [UserRole.ADMIN, UserRole.MARKETING_AGENT, UserRole.SALES_MANAGER, UserRole.CLUB_MANAGER]

@api_router.post("/forms")
async def create_form(form_data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MARKETING_AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")
    form_doc = {
        "name": form_data.get("name", ""),
        "headline": form_data.get("headline", ""),
        "description": form_data.get("description", ""),
        "platform": form_data.get("platform", "website"),
        "webhook_url": "",
        "questions": form_data.get("questions", []),
        "media_ids": form_data.get("media_ids", []),
        "active": True,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.forms.insert_one(form_doc)
    form_id = str(result.inserted_id)
    webhook_url = f"/api/webhooks/form/{form_id}"
    await db.forms.update_one({"_id": result.inserted_id}, {"$set": {"webhook_url": webhook_url}})
    form_doc.pop("_id", None)
    form_doc["id"] = form_id
    form_doc["webhook_url"] = webhook_url
    return form_doc

@api_router.get("/forms")
async def get_forms(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in MARKETING_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    forms = await db.forms.find().sort("created_at", -1).to_list(1000)
    result = []
    for f in forms:
        form_id = str(f["_id"])
        lead_count = await db.leads.count_documents({"source_form_id": form_id})
        apt_count = await db.appointments.count_documents({"source_form_id": form_id})
        deal_count = await db.deals.count_documents({"source_form_id": form_id})
        conversion = (deal_count / lead_count * 100) if lead_count > 0 else 0
        f.pop("_id", None)
        f["id"] = form_id
        f["performance"] = {
            "total_leads": lead_count,
            "appointments": apt_count,
            "deals": deal_count,
            "conversion_rate": round(conversion, 1)
        }
        result.append(f)
    return result

@api_router.get("/forms/{form_id}")
async def get_form(form_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in MARKETING_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    form = await db.forms.find_one({"_id": validate_object_id(form_id, "form")})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    fid = str(form["_id"])
    form.pop("_id", None)
    form["id"] = fid
    lead_count = await db.leads.count_documents({"source_form_id": fid})
    deal_count = await db.deals.count_documents({"source_form_id": fid})
    conversion = (deal_count / lead_count * 100) if lead_count > 0 else 0
    form["performance"] = {"total_leads": lead_count, "deals": deal_count, "conversion_rate": round(conversion, 1)}
    return form

@api_router.put("/forms/{form_id}")
async def update_form(form_id: str, updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MARKETING_AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates.pop("_id", None)
    updates.pop("id", None)
    await db.forms.update_one({"_id": validate_object_id(form_id, "form")}, {"$set": updates})
    return {"success": True}

@api_router.delete("/forms/{form_id}")
async def delete_form(form_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MARKETING_AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.forms.delete_one({"_id": validate_object_id(form_id, "form")})
    return {"success": True}

# ==========================================
# Meta / Facebook Lead Ads Webhook
# ==========================================

META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "xac_crm_meta_verify")

@api_router.get("/meta/config")
async def get_meta_config(current_user: dict = Depends(get_current_user)):
    """Get Meta integration configuration."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    config = await db.settings.find_one({}, {"meta_page_token": 1, "meta_page_access_token": 1, "meta_page_id": 1, "meta_connected": 1, "_id": 0})
    if not config:
        config = {}
    # Show status based on whichever token exists
    token = config.get("meta_page_access_token") or config.get("meta_page_token", "")
    masked = f"{token[:8]}...{token[-4:]}" if len(token) > 12 else ("*" * len(token) if token else "")
    return {
        "page_token_set": bool(token),
        "page_token_masked": masked,
        "page_id": config.get("meta_page_id", ""),
        "connected": config.get("meta_connected", False),
        "webhook_url": f"/api/webhooks/meta",
        "verify_token": META_VERIFY_TOKEN
    }

@api_router.put("/meta/config")
async def update_meta_config(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Save Meta integration configuration."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {}
    if "page_token" in data:
        updates["meta_page_token"] = data["page_token"]
    if "page_id" in data:
        updates["meta_page_id"] = data["page_id"]
    if "connected" in data:
        updates["meta_connected"] = data["connected"]
    if updates:
        await db.settings.update_one({}, {"$set": updates}, upsert=True)
    return {"success": True}

@api_router.post("/meta/test-connection")
async def test_meta_connection(current_user: dict = Depends(get_current_user)):
    """Test Meta Graph API connection. Auto-detects page and converts User token to Page token."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    config = await db.settings.find_one({}, {"meta_page_token": 1, "meta_page_access_token": 1, "meta_page_id": 1, "_id": 0})
    token = (config or {}).get("meta_page_token", "")
    page_id = (config or {}).get("meta_page_id", "")
    if not token:
        return {"success": False, "error": "No Page Access Token configured"}
    
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            # First: fetch pages this token manages (works with User tokens)
            pages_resp = await client.get(
                "https://graph.facebook.com/v21.0/me/accounts",
                params={"access_token": token, "fields": "id,name,access_token", "limit": 100}
            )
            pages_data = pages_resp.json()
            
            if "data" in pages_data and len(pages_data["data"]) > 0:
                pages = pages_data["data"]
                selected_page = None
                
                if page_id:
                    selected_page = next((p for p in pages if p["id"] == page_id), None)
                if not selected_page:
                    selected_page = pages[0]
                
                page_access_token = selected_page.get("access_token", token)
                actual_page_id = selected_page["id"]
                page_name = selected_page.get("name", "Unknown Page")
                
                # Store the PAGE access token separately
                await db.settings.update_one({}, {"$set": {
                    "meta_connected": True,
                    "meta_page_id": actual_page_id,
                    "meta_page_access_token": page_access_token
                }})
                
                all_pages = [{"id": p["id"], "name": p.get("name", "")} for p in pages]
                return {"success": True, "page_name": page_name, "page_id": actual_page_id, "pages_found": all_pages}
            
            # Fallback: direct page query (already a page token)
            url = f"https://graph.facebook.com/v21.0/{page_id or 'me'}"
            resp = await client.get(url, params={"access_token": token, "fields": "name,id"})
            data = resp.json()
            if "error" in data:
                await db.settings.update_one({}, {"$set": {"meta_connected": False}})
                return {"success": False, "error": data["error"].get("message", "Invalid token")}
            await db.settings.update_one({}, {"$set": {
                "meta_connected": True,
                "meta_page_id": data.get("id", page_id),
                "meta_page_access_token": token
            }})
            return {"success": True, "page_name": data.get("name"), "page_id": data.get("id")}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/meta/recent-leads")
async def get_recent_meta_leads(current_user: dict = Depends(get_current_user)):
    """Get recent webhook logs for Meta."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    logs = await db.webhook_logs.find({"source": "meta"}).sort("received_at", -1).to_list(10)
    return [{
        "id": str(log["_id"]),
        "received_at": log.get("received_at", ""),
        "status": log.get("status", "received"),
        "payload_preview": str(log.get("payload", {}))[:200]
    } for log in logs]

@api_router.post("/meta/import-leads")
async def import_meta_leads(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Import historical leads from Meta Lead Ads via Graph API."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    config = await db.settings.find_one({}, {"meta_page_token": 1, "meta_page_access_token": 1, "meta_page_id": 1, "_id": 0})
    # Prefer page access token (set by Test Connection), fallback to user token
    token = (config or {}).get("meta_page_access_token") or (config or {}).get("meta_page_token", "")
    page_id = (config or {}).get("meta_page_id", "")
    
    if not token:
        raise HTTPException(status_code=400, detail="No Page Access Token configured. Go to Settings → Integrations, save your token, then click Test Connection.")
    if not page_id:
        raise HTTPException(status_code=400, detail="No Page ID configured. Click Test Connection first to detect your page.")
    
    from_date = data.get("from_date", "")
    to_date = data.get("to_date", "")
    
    if not from_date or not to_date:
        raise HTTPException(status_code=400, detail="Both from_date and to_date are required (YYYY-MM-DD)")
    
    import httpx
    from datetime import datetime as dt
    
    # Convert dates to Unix timestamps for Meta API filtering
    from_ts = int(dt.strptime(from_date, "%Y-%m-%d").timestamp())
    to_ts = int(dt.strptime(to_date + " 23:59:59", "%Y-%m-%d %H:%M:%S").timestamp())
    
    leads_imported = 0
    leads_skipped = 0
    errors = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Get all lead forms for this page
            forms_url = f"https://graph.facebook.com/v21.0/{page_id}/leadgen_forms"
            forms_resp = await client.get(forms_url, params={"access_token": token, "fields": "id,name,status", "limit": 100})
            forms_data = forms_resp.json()
            
            if "error" in forms_data:
                raise HTTPException(status_code=400, detail=f"Meta API error: {forms_data['error'].get('message', 'Unknown error')}")
            
            forms = forms_data.get("data", [])
            logger.info(f"Found {len(forms)} lead forms for page {page_id}")
            
            # Step 2: For each form, fetch leads within the date range
            for form in forms:
                form_id = form["id"]
                form_name = form.get("name", "Unknown Form")
                
                # Fetch leads with time filtering
                leads_url = f"https://graph.facebook.com/v21.0/{form_id}/leads"
                params = {
                    "access_token": token,
                    "fields": "id,created_time,field_data",
                    "limit": 500,
                    "filtering": f'[{{"field":"time_created","operator":"GREATER_THAN","value":"{from_ts}"}},{{"field":"time_created","operator":"LESS_THAN","value":"{to_ts}"}}]'
                }
                
                next_url = None
                page_num = 0
                
                while True:
                    if next_url:
                        resp = await client.get(next_url)
                    else:
                        resp = await client.get(leads_url, params=params)
                    
                    resp_data = resp.json()
                    
                    if "error" in resp_data:
                        errors.append(f"Form '{form_name}': {resp_data['error'].get('message', 'Unknown')}")
                        break
                    
                    leads_list = resp_data.get("data", [])
                    page_num += 1
                    logger.info(f"Form '{form_name}' page {page_num}: {len(leads_list)} leads")
                    
                    for meta_lead in leads_list:
                        leadgen_id = meta_lead.get("id", "")
                        
                        # Check if already imported (by leadgen_id in notes)
                        existing = await db.leads.find_one({"notes": {"$regex": leadgen_id}})
                        if existing:
                            leads_skipped += 1
                            continue
                        
                        # Parse field_data
                        field_data = meta_lead.get("field_data", [])
                        lead_fields = {}
                        for field in field_data:
                            fname = field.get("name", "").lower()
                            fvalues = field.get("values", [])
                            fval = fvalues[0] if fvalues else ""
                            lead_fields[fname] = fval
                        
                        name = lead_fields.get("full_name") or lead_fields.get("first_name") or lead_fields.get("name", "Facebook Lead")
                        surname = lead_fields.get("last_name") or lead_fields.get("surname", "")
                        email = lead_fields.get("email", "") or None
                        phone = (lead_fields.get("phone_number") or lead_fields.get("phone") 
                                or lead_fields.get("whatsapp_number") or lead_fields.get("whatsapp") 
                                or lead_fields.get("cell") or lead_fields.get("mobile") or "")
                        
                        # Split full_name into name + surname if no separate surname
                        if not surname and name and " " in name:
                            parts = name.strip().split(" ", 1)
                            name = parts[0]
                            surname = parts[1] if len(parts) > 1 else ""
                        
                        consultant = await get_next_consultant_for_assignment()
                        
                        lead_doc = {
                            "name": name,
                            "surname": surname or None,
                            "email": email or None,
                            "phone": phone,
                            "source": "Facebook Lead Ad",
                            "campaign": form_name,
                            "stage": LeadStage.NEW_LEAD,
                            "owner_id": str(consultant["_id"]) if consultant else None,
                            "tags": ["meta", "imported"],
                            "notes": f"Leadgen ID: {leadgen_id} | Form: {form_name}",
                            "form_answers": lead_fields,
                            "created_at": meta_lead.get("created_time", datetime.now(timezone.utc).isoformat()),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                            "last_contact": None
                        }
                        
                        result = await db.leads.insert_one(lead_doc)
                        leads_imported += 1
                        
                        # Log activity
                        await db.activities.insert_one({
                            "lead_id": str(result.inserted_id),
                            "user_id": str(current_user["_id"]),
                            "activity_type": "lead_created",
                            "content": f"Imported from Meta — Form: {form_name}",
                            "notes": None,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
                        
                        # Notify assigned consultant
                        if consultant:
                            await create_notification(
                                str(consultant["_id"]),
                                "meta_lead",
                                "New Facebook Lead (Imported)",
                                f"{name} {surname} ({phone}) imported from {form_name}.",
                                str(result.inserted_id)
                            )
                    
                    # Check for pagination
                    paging = resp_data.get("paging", {})
                    next_url = paging.get("next")
                    if not next_url or not leads_list:
                        break
        
        return {
            "success": True,
            "leads_imported": leads_imported,
            "leads_skipped": leads_skipped,
            "forms_checked": len(forms),
            "errors": errors
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Meta import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import PlainTextResponse
from starlette.requests import Request as StarletteRequest

@api_router.get("/webhooks/meta", response_class=PlainTextResponse)
async def meta_webhook_verify(request: Request):
    """Meta webhook verification - responds to hub.challenge for subscription setup."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    logger.info(f"Meta verify request: mode={mode}, token_match={token == META_VERIFY_TOKEN}, challenge={challenge}")
    
    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        logger.info("Meta webhook verified successfully")
        return PlainTextResponse(content=str(challenge), status_code=200)
    
    logger.warning(f"Meta webhook verification failed: mode={mode}, token={token}")
    raise HTTPException(status_code=403, detail="Verification failed")

# Also mount at app level (without /api prefix) as Meta may call either path
@app.get("/webhooks/meta", response_class=PlainTextResponse)
async def meta_webhook_verify_root(request: Request):
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        return PlainTextResponse(content=str(challenge), status_code=200)
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/webhooks/meta")
async def meta_webhook_receive_root(payload: Dict[str, Any]):
    return await meta_webhook_receive(payload)

@api_router.post("/webhooks/meta")
async def meta_webhook_receive(payload: Dict[str, Any]):
    """Receive lead data from Meta Lead Ads (Facebook/Instagram)."""
    logger.info(f"Meta webhook received: {payload}")
    
    # Store raw webhook for debugging
    await db.webhook_logs.insert_one({
        "source": "meta",
        "payload": payload,
        "received_at": datetime.now(timezone.utc).isoformat()
    })
    
    try:
        # Meta sends data in the format: { "entry": [{ "changes": [{ "value": { "leadgen_id": ..., "field_data": [...] } }] }] }
        entries = payload.get("entry", [])
        leads_created = 0
        
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # Extract lead data from field_data array
                field_data = value.get("field_data", [])
                lead_fields = {}
                for field in field_data:
                    fname = field.get("name", "").lower()
                    fvalues = field.get("values", [])
                    fval = fvalues[0] if fvalues else ""
                    lead_fields[fname] = fval
                
                # Also handle direct payload format (from Zapier, Make, etc.)
                if not lead_fields:
                    lead_fields = {
                        "name": payload.get("name") or payload.get("full_name") or payload.get("first_name", ""),
                        "surname": payload.get("surname") or payload.get("last_name", ""),
                        "email": payload.get("email", ""),
                        "phone": payload.get("phone") or payload.get("phone_number", ""),
                    }
                
                name = lead_fields.get("full_name") or lead_fields.get("first_name") or lead_fields.get("name", "Facebook Lead")
                surname = lead_fields.get("last_name") or lead_fields.get("surname", "")
                email = lead_fields.get("email") or lead_fields.get("email_address", "") or None
                phone = (lead_fields.get("phone_number") or lead_fields.get("phone") 
                        or lead_fields.get("whatsapp_number") or lead_fields.get("whatsapp") 
                        or lead_fields.get("cell") or lead_fields.get("mobile") or "")
                
                # Split full_name into name + surname if no separate surname
                if not surname and name and " " in name:
                    parts = name.strip().split(" ", 1)
                    name = parts[0]
                    surname = parts[1] if len(parts) > 1 else ""
                
                consultant = await get_next_consultant_for_assignment()
                
                lead_doc = {
                    "name": name,
                    "surname": surname or None,
                    "email": email or None,
                    "phone": phone,
                    "source": "Facebook Lead Ad",
                    "campaign": value.get("form_id") or payload.get("campaign", "Meta"),
                    "stage": LeadStage.NEW_LEAD,
                    "owner_id": str(consultant["_id"]) if consultant else None,
                    "tags": ["meta", "auto-captured"],
                    "notes": f"Leadgen ID: {value.get('leadgen_id', 'N/A')}",
                    "form_answers": lead_fields,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_contact": None
                }
                
                result = await db.leads.insert_one(lead_doc)
                leads_created += 1
                logger.info(f"Meta lead created: {name} {surname} - {phone}")
                
                # Notify: Meta Lead Captured
                if consultant:
                    await create_notification(
                        str(consultant["_id"]),
                        "meta_lead",
                        "New Facebook Lead!",
                        f"{name} {surname} ({phone}) from Facebook Lead Ad.",
                        str(result.inserted_id)
                    )
                await notify_managers("meta_lead", "Facebook Lead Captured", f"{name} {surname} — {phone}", str(result.inserted_id))
        
        # If no entries format, try flat payload (from Make/Zapier direct)
        if leads_created == 0 and (payload.get("name") or payload.get("first_name") or payload.get("full_name")):
            name = payload.get("name") or payload.get("full_name") or payload.get("first_name", "Lead")
            surname = payload.get("surname") or payload.get("last_name", "")
            email = payload.get("email", "") or None
            phone = payload.get("phone") or payload.get("phone_number", "")
            
            consultant = await get_next_consultant_for_assignment()
            
            lead_doc = {
                "name": name,
                "surname": surname or None,
                "email": email or None,
                "phone": phone,
                "source": "Facebook Lead Ad",
                "campaign": payload.get("campaign", payload.get("form_name", "Meta")),
                "stage": LeadStage.NEW_LEAD,
                "owner_id": str(consultant["_id"]) if consultant else None,
                "tags": ["meta", "auto-captured"],
                "notes": "",
                "form_answers": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "last_contact": None
            }
            
            result = await db.leads.insert_one(lead_doc)
            leads_created += 1
            logger.info(f"Meta flat lead created: {name}")
            
            # Notify: Meta Lead Captured
            if consultant:
                await create_notification(
                    str(consultant["_id"]),
                    "meta_lead",
                    "New Facebook Lead!",
                    f"{name} ({phone}) from Facebook Lead Ad.",
                    str(result.inserted_id)
                )
            await notify_managers("meta_lead", "Facebook Lead Captured", f"{name} — {phone}", str(result.inserted_id))
        
        return {"success": True, "leads_created": leads_created}
    
    except Exception as e:
        logger.error(f"Meta webhook processing error: {e}")
        return {"success": False, "error": str(e)}

# Webhook endpoint for receiving leads from forms
@api_router.post("/webhooks/form/{form_id}")
async def form_webhook(form_id: str, payload: Dict[str, Any]):
    form = await db.forms.find_one({"_id": validate_object_id(form_id, "form")})
    if not form or not form.get("active"):
        raise HTTPException(status_code=404, detail="Form not found or inactive")
    
    consultant = await get_next_consultant_for_assignment()
    lead_doc = {
        "name": payload.get("name", payload.get("full_name", "Unknown")),
        "surname": payload.get("surname", payload.get("last_name", "")),
        "email": payload.get("email", ""),
        "phone": payload.get("phone", payload.get("phone_number", "")),
        "source": f"{form.get('platform', 'website')} - {form.get('name', 'Form')}",
        "source_form_id": form_id,
        "campaign": form.get("name", ""),
        "stage": LeadStage.NEW_LEAD,
        "owner_id": str(consultant["_id"]) if consultant else None,
        "tags": [],
        "notes": "",
        "form_answers": payload.get("answers", {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None
    }
    result = await db.leads.insert_one(lead_doc)
    return {"success": True, "lead_id": str(result.inserted_id)}

# ==========================================
# Tally Forms Webhook
# ==========================================

@api_router.post("/webhooks/tally")
async def tally_webhook_receive(payload: Dict[str, Any]):
    """Receive lead data from Tally form submissions."""
    logger.info(f"Tally webhook received: {str(payload)[:500]}")
    
    # Store raw webhook for debugging
    await db.webhook_logs.insert_one({
        "source": "tally",
        "payload": payload,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "status": "processing"
    })
    
    try:
        event_type = payload.get("eventType", "")
        if event_type != "FORM_RESPONSE":
            return {"success": True, "message": "Non-submission event ignored"}
        
        data = payload.get("data", {})
        fields = data.get("fields", [])
        form_name = data.get("formName", "Tally Form")
        form_id = data.get("formId", "")
        response_id = data.get("responseId", "")
        
        # Build a lookup dict from fields by label (case-insensitive)
        field_map = {}
        for f in fields:
            label = (f.get("label") or "").strip().lower()
            value = f.get("value", "")
            # Handle choice fields (value can be a list or object)
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            elif isinstance(value, dict):
                value = value.get("label", str(value))
            field_map[label] = str(value) if value else ""
        
        # Extract lead fields with flexible matching
        name = (
            field_map.get("first name") or 
            field_map.get("name") or 
            field_map.get("full name") or 
            field_map.get("first_name") or 
            "Tally Lead"
        )
        surname = (
            field_map.get("last name") or 
            field_map.get("surname") or 
            field_map.get("last_name") or 
            ""
        )
        phone = (
            field_map.get("phone number") or 
            field_map.get("phone") or 
            field_map.get("phone_number") or 
            field_map.get("cell") or 
            field_map.get("mobile") or 
            field_map.get("whatsapp") or 
            ""
        )
        email = (
            field_map.get("email address") or 
            field_map.get("email") or 
            field_map.get("e-mail") or 
            ""
        ) or None
        
        # Collect all other fields as notes
        extra_notes = []
        skip_labels = {"first name", "name", "full name", "first_name", "last name", "surname", "last_name", 
                       "phone number", "phone", "phone_number", "cell", "mobile", "whatsapp",
                       "email address", "email", "e-mail"}
        for f in fields:
            label = (f.get("label") or "").strip()
            label_lower = label.lower()
            if label_lower not in skip_labels and f.get("value"):
                value = f.get("value", "")
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                elif isinstance(value, dict):
                    value = value.get("label", str(value))
                if value:
                    extra_notes.append(f"{label}: {value}")
        
        notes_str = " | ".join(extra_notes) if extra_notes else ""
        
        # Check for duplicate by response_id
        if response_id:
            existing = await db.leads.find_one({"notes": {"$regex": response_id}})
            if existing:
                await db.webhook_logs.update_one(
                    {"source": "tally", "payload.data.responseId": response_id},
                    {"$set": {"status": "duplicate"}}
                )
                return {"success": True, "message": "Duplicate submission"}
        
        consultant = await get_next_consultant_for_assignment()
        
        lead_doc = {
            "name": name,
            "surname": surname or None,
            "email": email,
            "phone": phone,
            "source": f"Tally - {form_name}",
            "campaign": form_name,
            "stage": LeadStage.NEW_LEAD,
            "owner_id": str(consultant["_id"]) if consultant else None,
            "tags": ["tally", "auto-captured"],
            "notes": f"Response ID: {response_id}" + (f" | {notes_str}" if notes_str else ""),
            "form_answers": field_map,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_contact": None
        }
        
        result = await db.leads.insert_one(lead_doc)
        lead_id = str(result.inserted_id)
        
        # Log activity
        await db.activities.insert_one({
            "lead_id": lead_id,
            "user_id": str(consultant["_id"]) if consultant else "system",
            "activity_type": "lead_created",
            "content": f"Lead captured from Tally — {form_name}",
            "notes": notes_str or None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Notify assigned consultant
        if consultant:
            await create_notification(
                str(consultant["_id"]),
                "tally_lead",
                "New Tally Form Lead!",
                f"{name} {surname} ({phone}) from {form_name}.",
                lead_id
            )
        await notify_managers("tally_lead", "Tally Lead Captured", f"{name} {surname} — {phone} from {form_name}", lead_id)
        
        # Update webhook log status
        await db.webhook_logs.update_one(
            {"source": "tally", "payload.data.responseId": response_id},
            {"$set": {"status": "processed"}}
        )
        
        logger.info(f"Tally lead created: {name} {surname} - {phone} from {form_name}")
        return {"success": True, "lead_id": lead_id}
    
    except Exception as e:
        logger.error(f"Tally webhook processing error: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/webhooks/tally/forms")
async def get_tally_webhook_info(current_user: dict = Depends(get_current_user)):
    """Get Tally webhook configuration info."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    recent = await db.webhook_logs.find({"source": "tally"}).sort("received_at", -1).to_list(10)
    return {
        "webhook_url": "/api/webhooks/tally",
        "recent_submissions": [{
            "id": str(log["_id"]),
            "received_at": log.get("received_at", ""),
            "status": log.get("status", "received"),
            "form_name": log.get("payload", {}).get("data", {}).get("formName", "Unknown")
        } for log in recent]
    }

# Gallery / Media endpoints
import base64

MEDIA_DIR = "/app/uploads/media"
os.makedirs(MEDIA_DIR, exist_ok=True)

@api_router.post("/gallery/upload")
async def upload_media(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    allowed_roles = [UserRole.ADMIN, UserRole.MARKETING_AGENT, UserRole.SALES_MANAGER, UserRole.CLUB_MANAGER]
    if current_user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    file_id = str(ObjectId())
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(MEDIA_DIR, filename)
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    media_doc = {
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(contents),
        "uploaded_by": str(current_user["_id"]),
        "uploaded_by_name": current_user["name"],
        "url": f"/api/gallery/file/{filename}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.media.insert_one(media_doc)
    media_doc.pop("_id", None)
    media_doc["id"] = str(result.inserted_id)
    return media_doc

@api_router.get("/gallery")
async def get_gallery(current_user: dict = Depends(get_current_user)):
    media = await db.media.find().sort("created_at", -1).to_list(1000)
    return [
        {
            "id": str(m["_id"]),
            "filename": m["filename"],
            "original_name": m["original_name"],
            "content_type": m.get("content_type", ""),
            "size": m.get("size", 0),
            "uploaded_by_name": m.get("uploaded_by_name", ""),
            "url": m["url"],
            "created_at": m.get("created_at", "")
        }
        for m in media
    ]

@api_router.delete("/gallery/{media_id}")
async def delete_media(media_id: str, current_user: dict = Depends(get_current_user)):
    allowed_roles = [UserRole.ADMIN, UserRole.MARKETING_AGENT, UserRole.SALES_MANAGER, UserRole.CLUB_MANAGER]
    if current_user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied")
    media = await db.media.find_one({"_id": validate_object_id(media_id, "media")})
    if media:
        filepath = os.path.join(MEDIA_DIR, media["filename"])
        if os.path.exists(filepath):
            os.remove(filepath)
        await db.media.delete_one({"_id": validate_object_id(media_id, "media")})
    return {"success": True}

from fastapi.responses import FileResponse as FastAPIFileResponse

@api_router.get("/gallery/file/{filename}")
async def serve_media_file(filename: str):
    filepath = os.path.join(MEDIA_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FastAPIFileResponse(filepath)

# Marketing Dashboard Stats
@api_router.get("/marketing/stats")
async def get_marketing_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MARKETING_AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    total_forms = await db.forms.count_documents({})
    active_forms = await db.forms.count_documents({"active": True})
    total_leads_from_forms = await db.leads.count_documents({"source_form_id": {"$exists": True, "$ne": None}})
    total_media = await db.media.count_documents({})
    
    # Per-platform breakdown
    platforms = ["facebook", "instagram", "tiktok", "website", "other"]
    platform_stats = []
    for p in platforms:
        count = await db.forms.count_documents({"platform": p})
        leads = await db.leads.count_documents({"source": {"$regex": p, "$options": "i"}})
        if count > 0 or leads > 0:
            platform_stats.append({"platform": p, "forms": count, "leads": leads})
    
    # Top forms by leads
    forms = await db.forms.find({"active": True}).to_list(100)
    top_forms = []
    for f in forms:
        fid = str(f["_id"])
        lc = await db.leads.count_documents({"source_form_id": fid})
        dc = await db.deals.count_documents({"source_form_id": fid})
        top_forms.append({
            "name": f.get("name", ""),
            "platform": f.get("platform", ""),
            "leads": lc,
            "deals": dc,
            "conversion": round((dc / lc * 100) if lc > 0 else 0, 1)
        })
    top_forms.sort(key=lambda x: x["leads"], reverse=True)
    
    return {
        "total_forms": total_forms,
        "active_forms": active_forms,
        "total_leads": total_leads_from_forms,
        "total_media": total_media,
        "platform_stats": platform_stats,
        "top_forms": top_forms[:10]
    }

from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid as uuid_module

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ==========================================
# AI Chat Assistant
# ==========================================

class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/ai/chat")
async def ai_chat(req: AIChatRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can use AI assistant")
    
    session_id = req.session_id or str(uuid_module.uuid4())
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are the XAC CRM AI Assistant for Revival Fitness, a gym-focused CRM system. Help with CRM usage tips, sales strategies, lead management advice, WhatsApp messaging best practices, fitness industry marketing guidance, and troubleshooting CRM features. Be concise and professional."
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=req.message)
        response = await chat.send_message(user_message)
        
        # Store in DB for persistence
        await db.ai_chat_logs.insert_one({
            "session_id": session_id,
            "user_id": str(current_user["_id"]),
            "user_message": req.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/ai/chat/history/{session_id}")
async def get_ai_chat_history(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.ai_chat_logs.find({"session_id": session_id}).sort("created_at", 1).to_list(100)
    return [
        {
            "user_message": log["user_message"],
            "ai_response": log["ai_response"],
            "created_at": log["created_at"]
        }
        for log in logs
    ]

# ==========================================
# Global Password Reset + MASTER Account
# ==========================================

@api_router.post("/admin/reset-all-passwords")
async def reset_all_passwords(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can reset passwords")
    
    new_password_hash = pwd_context.hash("123xyz/")
    result = await db.users.update_many({}, {"$set": {"password": new_password_hash}})
    
    await db.audit_logs.insert_one({
        "action": "global_password_reset",
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {"users_affected": result.modified_count}
    })
    
    return {"success": True, "users_reset": result.modified_count, "new_password": "123xyz/"}

@api_router.post("/admin/create-master-account")
async def create_master_account(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create master accounts")
    
    existing = await db.users.find_one({"email": "mastergrey666@xac.com"})
    if existing:
        return {"success": True, "message": "MASTER account already exists", "id": str(existing["_id"])}
    
    master_doc = {
        "email": "mastergrey666@xac.com",
        "password": pwd_context.hash("MASTERGREY666"),
        "name": "MASTERGREY666",
        "role": UserRole.ADMIN,
        "phone": "",
        "active": True,
        "linked_consultants": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(master_doc)
    
    return {"success": True, "message": "MASTER account created", "id": str(result.inserted_id)}

# ==========================================
# Non-lead Appointments (Calendar standalone)
# ==========================================

class StandaloneAppointmentCreate(BaseModel):
    name: str
    surname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    scheduled_at: str
    notes: Optional[str] = None
    appointment_type: Optional[str] = "general"

@api_router.post("/appointments/standalone")
async def create_standalone_appointment(data: StandaloneAppointmentCreate, current_user: dict = Depends(get_current_user)):
    """Create an appointment without requiring an existing lead. Auto-creates a lead if needed."""
    # Create a lead entry for tracking
    lead_doc = {
        "name": data.name,
        "surname": data.surname,
        "email": data.email or None,
        "phone": data.phone or "",
        "source": "Calendar",
        "campaign": None,
        "stage": LeadStage.APPOINTMENT_SET,
        "owner_id": str(current_user["_id"]),
        "tags": [],
        "notes": data.notes,
        "form_answers": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None
    }
    lead_result = await db.leads.insert_one(lead_doc)
    lead_id = str(lead_result.inserted_id)
    
    appointment_doc = {
        "lead_id": lead_id,
        "scheduled_at": data.scheduled_at,
        "notes": data.notes,
        "appointment_type": data.appointment_type,
        "booked_by": str(current_user["_id"]),
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reminder_24h_sent": False,
        "reminder_2h_sent": False
    }
    result = await db.appointments.insert_one(appointment_doc)
    
    return {"success": True, "appointment_id": str(result.inserted_id), "lead_id": lead_id}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio as async_lib

async def appointment_reminder_loop():
    """Background task: check for upcoming appointments and send reminders."""
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # 24h reminder
            window_24h_start = (now + timedelta(hours=23, minutes=30)).isoformat()
            window_24h_end = (now + timedelta(hours=24, minutes=30)).isoformat()
            
            apts_24h = await db.appointments.find({
                "scheduled_at": {"$gte": window_24h_start, "$lte": window_24h_end},
                "reminder_24h_sent": {"$ne": True}
            }).to_list(100)
            
            for apt in apts_24h:
                lead = await db.leads.find_one({"_id": ObjectId(apt["lead_id"])})
                if lead and apt.get("booked_by"):
                    sched = apt["scheduled_at"].replace("T", " at ")[:16]
                    await create_notification(
                        apt["booked_by"],
                        "appointment_reminder",
                        "Appointment Tomorrow",
                        f"Reminder: {lead['name']} — appointment at {sched}.",
                        apt["lead_id"]
                    )
                    await db.appointments.update_one(
                        {"_id": apt["_id"]},
                        {"$set": {"reminder_24h_sent": True}}
                    )
            
            # 2h reminder
            window_2h_start = (now + timedelta(hours=1, minutes=30)).isoformat()
            window_2h_end = (now + timedelta(hours=2, minutes=30)).isoformat()
            
            apts_2h = await db.appointments.find({
                "scheduled_at": {"$gte": window_2h_start, "$lte": window_2h_end},
                "reminder_2h_sent": {"$ne": True}
            }).to_list(100)
            
            for apt in apts_2h:
                lead = await db.leads.find_one({"_id": ObjectId(apt["lead_id"])})
                if lead and apt.get("booked_by"):
                    sched_time = apt["scheduled_at"].split("T")[1][:5] if "T" in apt["scheduled_at"] else apt["scheduled_at"]
                    await create_notification(
                        apt["booked_by"],
                        "appointment_reminder",
                        "Appointment in 2 Hours",
                        f"{lead['name']} — appointment at {sched_time} today!",
                        apt["lead_id"]
                    )
                    await db.appointments.update_one(
                        {"_id": apt["_id"]},
                        {"$set": {"reminder_2h_sent": True}}
                    )
        except Exception as e:
            logger.error(f"Appointment reminder error: {e}")
        
        await async_lib.sleep(300)  # Check every 5 minutes

@app.on_event("startup")
async def startup_db():
    # Start appointment reminder checker
    import asyncio
    asyncio.create_task(appointment_reminder_loop())
    
    admin_exists = await db.users.find_one({"role": UserRole.ADMIN})
    
    if not admin_exists:
        admin_user = {
            "email": "admin@revivalfitness.com",
            "password": pwd_context.hash("Admin@2026"),
            "plain_password": "Admin@2026",
            "name": "System Admin",
            "role": UserRole.ADMIN,
            "phone": "+27123456789",
            "active": True,
            "linked_consultants": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: admin@revivalfitness.com / Admin@2026")
    
    # Ensure MASTER account exists
    master_exists = await db.users.find_one({"email": "mastergrey666@xac.com"})
    if not master_exists:
        master_user = {
            "email": "mastergrey666@xac.com",
            "password": pwd_context.hash("MASTERGREY666"),
            "plain_password": "MASTERGREY666",
            "name": "MASTERGREY666",
            "role": UserRole.ADMIN,
            "phone": "",
            "active": True,
            "linked_consultants": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(master_user)
        logger.info("MASTER account created: mastergrey666@xac.com / MASTERGREY666")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==========================================
# Bug Report Endpoints
# ==========================================

ADMIN_BUG_REPORT_PHONE = "27603245830"

class BugReportCreate(BaseModel):
    description: str
    priority: str = "medium"
    page: Optional[str] = None
    browser: Optional[str] = None

@api_router.post("/bug-reports")
async def create_bug_report(data: BugReportCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    report = {
        "description": data.description,
        "priority": data.priority,
        "page": data.page,
        "browser": data.browser,
        "reported_by": user_id,
        "reported_by_name": current_user["name"],
        "reported_by_email": current_user["email"],
        "status": "open",
        "wa_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.bug_reports.insert_one(report)
    report_id = str(result.inserted_id)

    # Build WhatsApp message
    wa_message = (
        f"*BUG REPORT #{report_id[-6:].upper()}*\n"
        f"---\n"
        f"*From:* {current_user['name']} ({current_user['email']})\n"
        f"*Priority:* {data.priority.upper()}\n"
        f"*Page:* {data.page or 'N/A'}\n"
        f"*Time:* {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"---\n"
        f"*Description:*\n{data.description}\n"
        f"---\n"
        f"*Status:* OPEN\n"
        f"*Action Required:* Review and assign fix"
    )

    # Send via reporter's WhatsApp session to admin number
    try:
        async with httpx.AsyncClient(timeout=30.0) as client_http:
            resp = await client_http.post(f"{WHATSAPP_SERVICE_URL}/send-message", json={
                "userId": user_id,
                "phoneNumber": ADMIN_BUG_REPORT_PHONE,
                "message": wa_message
            })
            wa_result = resp.json()
            if wa_result.get("success"):
                await db.bug_reports.update_one({"_id": result.inserted_id}, {"$set": {"wa_sent": True}})
    except Exception as e:
        logger.error(f"Bug report WA send error: {e}")

    return {"success": True, "id": report_id}

@api_router.get("/bug-reports")
async def get_bug_reports(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view all bug reports")
    reports = await db.bug_reports.find({}).sort("created_at", -1).to_list(500)
    return [{
        "id": str(r["_id"]),
        "description": r["description"],
        "priority": r.get("priority", "medium"),
        "page": r.get("page"),
        "reported_by": r.get("reported_by"),
        "reported_by_name": r.get("reported_by_name", "Unknown"),
        "reported_by_email": r.get("reported_by_email", ""),
        "status": r.get("status", "open"),
        "wa_sent": r.get("wa_sent", False),
        "created_at": r.get("created_at", "")
    } for r in reports]

@api_router.put("/bug-reports/{report_id}")
async def update_bug_report(report_id: str, updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update bug reports")
    allowed = {"status"}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if filtered:
        await db.bug_reports.update_one({"_id": validate_object_id(report_id, "report")}, {"$set": filtered})
    return {"success": True}

# ==========================================
# Webhook Logs & Marketing Endpoints
# ==========================================

@api_router.get("/webhook-logs")
async def get_webhook_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.MARKETING_AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")
    logs = await db.webhook_logs.find({}).sort("received_at", -1).limit(50).to_list(50)
    result = []
    for log in logs:
        payload = log.get("payload", {})
        lead_name = "Meta Lead"
        # Try to extract name from payload
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                for field in change.get("value", {}).get("field_data", []):
                    if field.get("name", "").lower() in ["full_name", "name"]:
                        vals = field.get("values", [])
                        if vals:
                            lead_name = vals[0]
        result.append({
            "id": str(log["_id"]),
            "source": log.get("source", "meta"),
            "lead_name": lead_name,
            "received_at": log.get("received_at", ""),
            "status": log.get("status", "processed")
        })
    return result

class LandingPageRequest(BaseModel):
    business_type: str = "gym"
    business_name: str = "Revival Fitness Centre"

@api_router.post("/ai/landing-pages")
async def generate_landing_pages(data: LandingPageRequest, current_user: dict = Depends(get_current_user)):
    """Generate 6 SEO landing page concepts."""
    pages = [
        {"title": f"{data.business_name} - Transform Your Body", "slug": "transform", "hook": "Start your fitness journey today. First session FREE!", "cta": "Claim Free Session"},
        {"title": f"{data.business_name} - Summer Ready Program", "slug": "summer", "hook": "Get beach-body ready in 12 weeks. Limited spots available.", "cta": "Reserve Your Spot"},
        {"title": f"{data.business_name} - Personal Training", "slug": "pt", "hook": "Expert 1-on-1 coaching tailored to your goals.", "cta": "Book Consultation"},
        {"title": f"{data.business_name} - Family Fitness", "slug": "family", "hook": "Bring the whole family. Group rates now available!", "cta": "Get Family Rate"},
        {"title": f"{data.business_name} - Corporate Wellness", "slug": "corporate", "hook": "Boost team productivity with corporate gym packages.", "cta": "Get Corporate Quote"},
        {"title": f"{data.business_name} - New Year Challenge", "slug": "challenge", "hook": "Join our 30-day transformation challenge. Cash prizes!", "cta": "Join Challenge"},
    ]
    return {"pages": pages}

# ==========================================
# Workflow Builder Endpoints
# ==========================================

class WorkflowCreate(BaseModel):
    name: str
    trigger_type: str  # new_lead, appointment, custom
    steps: List[Dict[str, Any]] = []
    active: bool = True

@api_router.get("/workflows")
async def get_workflows(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    workflows = await db.workflows.find({}).sort("created_at", -1).to_list(100)
    return [{
        "id": str(w["_id"]),
        "name": w["name"],
        "trigger_type": w["trigger_type"],
        "steps": w.get("steps", []),
        "active": w.get("active", True),
        "created_at": w.get("created_at", ""),
        "created_by": w.get("created_by", "")
    } for w in workflows]

@api_router.post("/workflows")
async def create_workflow(data: WorkflowCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    doc = {
        "name": data.name,
        "trigger_type": data.trigger_type,
        "steps": data.steps,
        "active": data.active,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.workflows.insert_one(doc)
    return {"id": str(result.inserted_id), "success": True}

@api_router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    updates.pop("_id", None)
    updates.pop("id", None)
    await db.workflows.update_one({"_id": validate_object_id(workflow_id, "workflow")}, {"$set": updates})
    return {"success": True}

@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.workflows.delete_one({"_id": validate_object_id(workflow_id, "workflow")})
    return {"success": True}

app.include_router(api_router)