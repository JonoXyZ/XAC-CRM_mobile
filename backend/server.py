from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header
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
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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

class LeadCreate(BaseModel):
    name: str
    surname: Optional[str] = None
    email: Optional[EmailStr] = None
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
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
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

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
            created_at=user.get("created_at", "")
        )
        for user in users
    ]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    if "password" in updates:
        updates["password"] = pwd_context.hash(updates["password"])
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    return {"success": True}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"active": False}})
    return {"success": True}

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    consultant = await get_next_consultant_for_assignment()
    
    lead_doc = {
        "name": lead_data.name,
        "surname": lead_data.surname,
        "email": lead_data.email,
        "phone": lead_data.phone,
        "source": lead_data.source,
        "campaign": lead_data.campaign,
        "stage": LeadStage.NEW_LEAD,
        "owner_id": str(consultant["_id"]) if consultant else None,
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
    
    if consultant:
        owner_name = consultant["name"]
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
        query["owner_id"] = str(current_user["_id"])
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
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    
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
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "stage" in update_data:
        await db.audit_logs.insert_one({
            "action": "stage_changed",
            "lead_id": lead_id,
            "user_id": str(current_user["_id"]),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": {"from": lead["stage"], "to": update_data["stage"]}
        })
    
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_data})
    
    return {"success": True}

@api_router.post("/leads/{lead_id}/reassign")
async def reassign_lead(lead_id: str, new_owner_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Only managers can reassign leads")
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
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
        lead_ids = await db.leads.find(
            {"owner_id": str(current_user["_id"])},
            {"_id": 1}
        ).to_list(1000)
        lead_id_strs = [str(lead["_id"]) for lead in lead_ids]
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
        {"_id": ObjectId(appointment_id)},
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
    user_id = str(current_user["_id"])
    
    # Replace template variables
    message_text = message.message
    if message.lead_id:
        lead = await db.leads.find_one({"_id": ObjectId(message.lead_id)})
        if lead:
            message_text = message_text.replace("{client_name}", lead["name"])
            message_text = message_text.replace("{phone}", lead["phone"])
    
    message_text = message_text.replace("{consultant_name}", current_user["name"])
    
    # Send via WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post("http://localhost:3001/send-message", json={
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
        return {"success": True, "message": "Message sent successfully"}
    else:
        raise HTTPException(status_code=500, detail=result.get("message", "Failed to send message"))

@api_router.get("/whatsapp/status")
async def whatsapp_status(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"http://localhost:3001/status/{user_id}")
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
            response = await client.get(f"http://localhost:3001/status/{user_id}")
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
            response = await client.post("http://localhost:3001/start-session", json={
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
            response = await client.get(f"http://localhost:3001/qr/{user_id}")
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
            response = await client.post("http://localhost:3001/logout", json={
                "userId": user_id
            })
            result = response.json()
            return result
    except Exception as e:
        logger.error(f"WhatsApp logout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/status-all")
async def get_all_whatsapp_status(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view all statuses")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:3001/status-all")
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
        {"_id": ObjectId(template_id)},
        {"$set": update_data}
    )
    
    return {"success": True}

@api_router.delete("/message-templates/{template_id}")
async def delete_message_template(template_id: str, current_user: dict = Depends(get_current_user)):
    await db.message_templates.delete_one({"_id": ObjectId(template_id)})
    return {"success": True}

@api_router.put("/leads/{lead_id}/score")
async def update_lead_score(lead_id: str, score: int, current_user: dict = Depends(get_current_user)):
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
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

@api_router.post("/reports/generate-month-report")
async def generate_month_report(current_user: dict = Depends(get_current_user)):
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
        "period_start": month_start,
        "period_end": month_end,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": str(current_user["_id"]),
        "deals": report_data,
        "total_deals": len(report_data),
        "total_cash_sales": sum(d.get("sales_value", 0) or 0 for d in deals if d["payment_type"] == "Cash"),
        "total_debit_sales": sum(d.get("debit_order_value", 0) or 0 for d in deals if d["payment_type"] == "Debit Order"),
        "total_units": sum(d.get("units", 0) or 0 for d in deals)
    }
    
    await db.month_reports.insert_one(report_doc)
    
    await db.leads.update_many(
        {"stage": LeadStage.CLOSED_WON},
        {"$set": {"stage": "Archived"}}
    )
    
    return {
        "success": True,
        "message": "Month report generated and deals cleared",
        "deals_count": len(report_data),
        "period": f"{month_start} to {month_end}"
    }

@api_router.get("/reports/month-reports")
async def get_month_reports(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    reports = await db.month_reports.find({}).sort("generated_at", -1).to_list(1000)
    
    return [
        {
            "id": str(report["_id"]),
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
    
    report = await db.month_reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "id": str(report["_id"]),
        "period_start": report["period_start"],
        "period_end": report["period_end"],
        "generated_at": report["generated_at"],
        "deals": report["deals"],
        "total_deals": report["total_deals"],
        "total_cash_sales": report["total_cash_sales"],
        "total_debit_sales": report["total_debit_sales"],
        "total_units": report["total_units"]
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    admin_exists = await db.users.find_one({"role": UserRole.ADMIN})
    
    if not admin_exists:
        admin_user = {
            "email": "admin@revivalfitness.com",
            "password": pwd_context.hash("Admin@2026"),
            "name": "System Admin",
            "role": UserRole.ADMIN,
            "phone": "+27123456789",
            "active": True,
            "linked_consultants": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: admin@revivalfitness.com / Admin@2026")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()