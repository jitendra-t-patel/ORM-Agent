from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import pandas as pd
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import asyncio
import random
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize sentiment analyzer
sentiment_analyzer = SentimentIntensityAnalyzer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enums
class Platform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class AlertType(str, Enum):
    SENTIMENT = "sentiment"
    VOLUME = "volume"
    RESPONSE_TIME = "response_time"

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ContentType(str, Enum):
    COMMENT = "comment"
    MENTION = "mention"
    POST = "post"

# Models
class Brand(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    facebook_page_id: Optional[str] = None
    instagram_business_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    settings: Dict[str, Any] = Field(default_factory=dict)

class BrandCreate(BaseModel):
    name: str
    facebook_page_id: Optional[str] = None
    instagram_business_id: Optional[str] = None

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    author_name: str
    author_id: str
    post_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sentiment_score: float = 0.0
    sentiment_type: SentimentType = SentimentType.NEUTRAL
    needs_response: bool = False
    has_response: bool = False
    response_time: Optional[int] = None  # in minutes
    priority: int = 0  # 0-5 priority scale

class CommentCreate(BaseModel):
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    author_name: str
    author_id: str
    post_id: str

class Mention(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    author_name: str
    author_id: str
    url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sentiment_score: float = 0.0
    sentiment_type: SentimentType = SentimentType.NEUTRAL
    reach: int = 0
    engagement: int = 0

class MentionCreate(BaseModel):
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    author_name: str
    author_id: str
    url: str
    reach: int = 0
    engagement: int = 0

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    likes: int = 0
    shares: int = 0
    comments_count: int = 0
    sentiment_score: float = 0.0
    sentiment_type: SentimentType = SentimentType.NEUTRAL

class PostCreate(BaseModel):
    brand_id: str
    platform: Platform
    platform_id: str
    content: str
    likes: int = 0
    shares: int = 0
    comments_count: int = 0

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    data: Dict[str, Any] = Field(default_factory=dict)

class AlertCreate(BaseModel):
    brand_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    data: Dict[str, Any] = Field(default_factory=dict)

class SentimentTrend(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    date: datetime = Field(default_factory=datetime.utcnow)
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    total_count: int = 0
    avg_sentiment_score: float = 0.0

class SentimentTrendCreate(BaseModel):
    brand_id: str
    date: datetime
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    total_count: int = 0
    avg_sentiment_score: float = 0.0

# Sentiment Analysis Functions
def analyze_sentiment(text: str) -> tuple[float, SentimentType]:
    """Analyze sentiment using VADER sentiment analyzer"""
    scores = sentiment_analyzer.polarity_scores(text)
    compound_score = scores['compound']
    
    if compound_score >= 0.05:
        sentiment_type = SentimentType.POSITIVE
    elif compound_score <= -0.05:
        sentiment_type = SentimentType.NEGATIVE
    else:
        sentiment_type = SentimentType.NEUTRAL
    
    return compound_score, sentiment_type

def calculate_priority(sentiment_score: float, engagement: int = 0) -> int:
    """Calculate priority score based on sentiment and engagement"""
    priority = 0
    
    # Base priority on sentiment
    if sentiment_score <= -0.5:
        priority += 5  # Very negative
    elif sentiment_score <= -0.1:
        priority += 3  # Negative
    elif sentiment_score >= 0.5:
        priority += 1  # Very positive
    
    # Adjust based on engagement
    if engagement > 100:
        priority += 2
    elif engagement > 50:
        priority += 1
    
    return min(priority, 5)

# Alert System Functions
async def check_sentiment_alerts(brand_id: str):
    """Check for sentiment-based alerts"""
    # Get recent comments (last 2 hours)
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    recent_comments = await db.comments.find({
        "brand_id": brand_id,
        "created_at": {"$gte": two_hours_ago}
    }).to_list(1000)
    
    if not recent_comments:
        return
    
    negative_comments = [c for c in recent_comments if c.get('sentiment_type') == 'negative']
    negative_ratio = len(negative_comments) / len(recent_comments)
    
    # Create alert if negative sentiment ratio is high
    if negative_ratio > 0.3:  # 30% negative threshold
        alert = AlertCreate(
            brand_id=brand_id,
            alert_type=AlertType.SENTIMENT,
            severity=AlertSeverity.HIGH if negative_ratio > 0.5 else AlertSeverity.MEDIUM,
            title="High Negative Sentiment Detected",
            description=f"Negative sentiment ratio: {negative_ratio:.1%} in the last 2 hours",
            data={"negative_ratio": negative_ratio, "total_comments": len(recent_comments)}
        )
        await create_alert(alert)

async def check_volume_alerts(brand_id: str):
    """Check for volume-based alerts"""
    # Get comments from last hour and compare with previous hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    
    current_hour_count = await db.comments.count_documents({
        "brand_id": brand_id,
        "created_at": {"$gte": one_hour_ago}
    })
    
    previous_hour_count = await db.comments.count_documents({
        "brand_id": brand_id,
        "created_at": {"$gte": two_hours_ago, "$lt": one_hour_ago}
    })
    
    if previous_hour_count > 0:
        volume_increase = (current_hour_count - previous_hour_count) / previous_hour_count
        
        if volume_increase > 2.0:  # 200% increase
            alert = AlertCreate(
                brand_id=brand_id,
                alert_type=AlertType.VOLUME,
                severity=AlertSeverity.HIGH,
                title="Unusual Activity Volume",
                description=f"Comment volume increased by {volume_increase:.1%} in the last hour",
                data={"volume_increase": volume_increase, "current_count": current_hour_count}
            )
            await create_alert(alert)

async def create_alert(alert_data: AlertCreate):
    """Create a new alert"""
    alert = Alert(**alert_data.dict())
    await db.alerts.insert_one(alert.dict())
    return alert

# API Routes

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "ORM AI Agent API", "version": "1.0.0"}

# Brand Management
@api_router.post("/brands", response_model=Brand)
async def create_brand(brand_data: BrandCreate):
    brand = Brand(**brand_data.dict())
    await db.brands.insert_one(brand.dict())
    return brand

@api_router.get("/brands", response_model=List[Brand])
async def get_brands():
    brands = await db.brands.find({"is_active": True}).to_list(1000)
    return [Brand(**brand) for brand in brands]

@api_router.get("/brands/{brand_id}", response_model=Brand)
async def get_brand(brand_id: str):
    brand = await db.brands.find_one({"id": brand_id})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return Brand(**brand)

@api_router.put("/brands/{brand_id}", response_model=Brand)
async def update_brand(brand_id: str, brand_data: BrandCreate):
    brand = await db.brands.find_one({"id": brand_id})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    updated_brand = Brand(**brand)
    for key, value in brand_data.dict(exclude_unset=True).items():
        setattr(updated_brand, key, value)
    
    await db.brands.replace_one({"id": brand_id}, updated_brand.dict())
    return updated_brand

@api_router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str):
    brand = await db.brands.find_one({"id": brand_id})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    await db.brands.update_one({"id": brand_id}, {"$set": {"is_active": False}})
    return {"message": "Brand deleted successfully"}

# Comments
@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate):
    # Analyze sentiment
    sentiment_score, sentiment_type = analyze_sentiment(comment_data.content)
    
    # Calculate priority
    priority = calculate_priority(sentiment_score)
    
    # Determine if needs response
    needs_response = sentiment_score < -0.1 or priority >= 3
    
    comment = Comment(
        **comment_data.dict(),
        sentiment_score=sentiment_score,
        sentiment_type=sentiment_type,
        priority=priority,
        needs_response=needs_response
    )
    
    await db.comments.insert_one(comment.dict())
    
    # Check for alerts
    await check_sentiment_alerts(comment_data.brand_id)
    await check_volume_alerts(comment_data.brand_id)
    
    return comment

@api_router.get("/comments", response_model=List[Comment])
async def get_comments(
    brand_id: Optional[str] = Query(None),
    platform: Optional[Platform] = Query(None),
    sentiment_type: Optional[SentimentType] = Query(None),
    needs_response: Optional[bool] = Query(None),
    limit: int = Query(100, le=1000)
):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    if platform:
        query["platform"] = platform
    if sentiment_type:
        query["sentiment_type"] = sentiment_type
    if needs_response is not None:
        query["needs_response"] = needs_response
    
    comments = await db.comments.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [Comment(**comment) for comment in comments]

@api_router.put("/comments/{comment_id}/respond")
async def mark_comment_responded(comment_id: str):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    response_time = int((datetime.utcnow() - comment["created_at"]).total_seconds() / 60)
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"has_response": True, "response_time": response_time}}
    )
    
    return {"message": "Comment marked as responded", "response_time": response_time}

# Mentions
@api_router.post("/mentions", response_model=Mention)
async def create_mention(mention_data: MentionCreate):
    # Analyze sentiment
    sentiment_score, sentiment_type = analyze_sentiment(mention_data.content)
    
    mention = Mention(
        **mention_data.dict(),
        sentiment_score=sentiment_score,
        sentiment_type=sentiment_type
    )
    
    await db.mentions.insert_one(mention.dict())
    return mention

@api_router.get("/mentions", response_model=List[Mention])
async def get_mentions(
    brand_id: Optional[str] = Query(None),
    platform: Optional[Platform] = Query(None),
    sentiment_type: Optional[SentimentType] = Query(None),
    limit: int = Query(100, le=1000)
):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    if platform:
        query["platform"] = platform
    if sentiment_type:
        query["sentiment_type"] = sentiment_type
    
    mentions = await db.mentions.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [Mention(**mention) for mention in mentions]

# Posts
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate):
    # Analyze sentiment
    sentiment_score, sentiment_type = analyze_sentiment(post_data.content)
    
    post = Post(
        **post_data.dict(),
        sentiment_score=sentiment_score,
        sentiment_type=sentiment_type
    )
    
    await db.posts.insert_one(post.dict())
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(
    brand_id: Optional[str] = Query(None),
    platform: Optional[Platform] = Query(None),
    limit: int = Query(100, le=1000)
):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    if platform:
        query["platform"] = platform
    
    posts = await db.posts.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [Post(**post) for post in posts]

# Alerts
@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    brand_id: Optional[str] = Query(None),
    alert_type: Optional[AlertType] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    is_acknowledged: Optional[bool] = Query(None),
    limit: int = Query(100, le=1000)
):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    if alert_type:
        query["alert_type"] = alert_type
    if severity:
        query["severity"] = severity
    if is_acknowledged is not None:
        query["is_acknowledged"] = is_acknowledged
    
    alerts = await db.alerts.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [Alert(**alert) for alert in alerts]

@api_router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    alert = await db.alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_acknowledged": True, "acknowledged_at": datetime.utcnow()}}
    )
    
    return {"message": "Alert acknowledged"}

# Analytics
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(brand_id: Optional[str] = Query(None)):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    
    # Get sentiment distribution
    sentiment_pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$sentiment_type",
            "count": {"$sum": 1}
        }}
    ]
    
    sentiment_results = await db.comments.aggregate(sentiment_pipeline).to_list(10)
    sentiment_distribution = {result["_id"]: result["count"] for result in sentiment_results}
    
    # Get recent activity
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_query = {**query, "created_at": {"$gte": seven_days_ago}}
    
    recent_comments = await db.comments.count_documents(recent_query)
    recent_mentions = await db.mentions.count_documents(recent_query)
    
    # Get priority items
    priority_items = await db.comments.find({
        **query,
        "needs_response": True,
        "has_response": False
    }).sort("priority", -1).limit(10).to_list(10)
    
    # Get unacknowledged alerts
    unack_alerts = await db.alerts.find({
        **query,
        "is_acknowledged": False
    }).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "sentiment_distribution": sentiment_distribution,
        "recent_activity": {
            "comments": recent_comments,
            "mentions": recent_mentions
        },
        "priority_items": [Comment(**item) for item in priority_items],
        "unacknowledged_alerts": [Alert(**alert) for alert in unack_alerts]
    }

@api_router.get("/analytics/trends")
async def get_sentiment_trends(
    brand_id: Optional[str] = Query(None),
    days: int = Query(7, le=30)
):
    query = {}
    if brand_id:
        query["brand_id"] = brand_id
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate sentiment data by day
    pipeline = [
        {"$match": {**query, "created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "sentiment_type": "$sentiment_type"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    
    results = await db.comments.aggregate(pipeline).to_list(1000)
    
    # Process results into daily trends
    trends = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
    
    for result in results:
        date = result["_id"]["date"]
        sentiment = result["_id"]["sentiment_type"]
        count = result["count"]
        trends[date][sentiment] = count
    
    return {
        "trends": dict(trends),
        "period": f"{days} days"
    }

# Sample Data Generation
@api_router.post("/sample-data/generate")
async def generate_sample_data():
    """Generate sample data for testing"""
    # Create sample brands
    brands = [
        BrandCreate(name="TechCorp", facebook_page_id="tech_corp_fb", instagram_business_id="tech_corp_ig"),
        BrandCreate(name="FoodiePlace", facebook_page_id="foodie_place_fb", instagram_business_id="foodie_place_ig"),
        BrandCreate(name="FashionBrand", facebook_page_id="fashion_brand_fb", instagram_business_id="fashion_brand_ig")
    ]
    
    created_brands = []
    for brand_data in brands:
        brand = Brand(**brand_data.dict())
        await db.brands.insert_one(brand.dict())
        created_brands.append(brand)
    
    # Generate sample comments
    sample_comments = [
        "Love this product! Amazing quality and service.",
        "Not satisfied with the delivery time. Very disappointed.",
        "Good value for money. Would recommend to others.",
        "The customer service was terrible. Will not buy again.",
        "Excellent experience! Fast delivery and great product.",
        "Average product. Nothing special but okay.",
        "Outstanding quality! Exceeded my expectations.",
        "Poor quality product. Waste of money.",
        "Great customer support. Very helpful team.",
        "Delivery was delayed but product is good.",
        "Fantastic! Will definitely order again.",
        "Not worth the price. Expected better quality.",
        "Amazing experience from start to finish!",
        "Product arrived damaged. Poor packaging.",
        "Reasonable price and good quality.",
        "Worst experience ever. Avoid this brand.",
        "Perfect! Everything was as described.",
        "Okay product but could be better.",
        "Excellent service and fast response.",
        "Quality issues with the product."
    ]
    
    # Generate comments for each brand
    for brand in created_brands:
        for i in range(20):
            comment_text = random.choice(sample_comments)
            comment_data = CommentCreate(
                brand_id=brand.id,
                platform=random.choice([Platform.FACEBOOK, Platform.INSTAGRAM]),
                platform_id=f"comment_{i}_{brand.id}",
                content=comment_text,
                author_name=f"User_{i}",
                author_id=f"user_{i}",
                post_id=f"post_{i}_{brand.id}"
            )
            await create_comment(comment_data)
    
    return {"message": "Sample data generated successfully", "brands_created": len(created_brands)}

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)